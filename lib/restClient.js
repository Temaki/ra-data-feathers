'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _reactAdmin = require('react-admin');

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _objectDiff = require('object-diff');

var _objectDiff2 = _interopRequireDefault(_objectDiff);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var dbg = (0, _debug2.default)('ra-data-feathers:rest-client');

var defaultIdKey = 'id';

var queryOperators = ['$gt', '$gte', '$lt', '$lte', '$ne', '$sort', '$or', '$nin', '$in'];

function flatten(object) {
  var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
  var stopKeys = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  return Object.keys(object).reduce(function (prev, element) {
    var hasNextLevel = object[element] && _typeof(object[element]) === 'object' && !Array.isArray(object[element]) && !Object.keys(object[element]).some(function (key) {
      return stopKeys.includes(key);
    });
    return hasNextLevel ? _extends({}, prev, flatten(object[element], '' + prefix + element + '.', stopKeys)) : _extends({}, prev, _defineProperty({}, '' + prefix + element, object[element]));
  }, {});
}

function getIdKey(_ref) {
  var resource = _ref.resource,
      options = _ref.options;

  return options[resource] && options[resource].id || options.id || defaultIdKey;
}

function deleteProp(obj, prop) {
  var res = Object.assign({}, obj);
  delete res[prop];
  return res;
}

/**
 * @param {{usePatch?: boolean, customQueryOperators?: string[], useMulti?: boolean, id?: string} & {[Key: string]: {id: string}}} options
 */

exports.default = function (client) {
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var usePatch = !!options.usePatch;
  var mapRequest = function mapRequest(type, resource, params) {
    var idKey = getIdKey({ resource: resource, options: options });
    dbg('type=%o, resource=%o, params=%o, idKey=%o', type, resource, params, idKey);
    var service = client.service(resource);
    var query = _extends({}, options.queryExtras || {});

    switch (type) {
      case _reactAdmin.GET_MANY:
        var ids = params.ids || [];
        query[idKey] = { $in: ids };
        query.$limit = ids.length;
        return service.find({ query: query });
      case _reactAdmin.GET_MANY_REFERENCE:
        if (params.target && params.id) {
          query[params.target] = params.id;
        }
      case _reactAdmin.GET_LIST:
        var _ref2 = params.pagination || {},
            page = _ref2.page,
            perPage = _ref2.perPage;

        var _ref3 = params.sort || {},
            field = _ref3.field,
            order = _ref3.order;

        var additionalQueryOperators = Array.isArray(options.customQueryOperators) ? options.customQueryOperators : [];
        var allUniqueQueryOperators = [].concat(_toConsumableArray(new Set(queryOperators.concat(additionalQueryOperators))));
        dbg('field=%o, order=%o', field, order);
        if (perPage && page) {
          query.$limit = perPage;
          query.$skip = perPage * (page - 1);
        }
        if (order) {
          query.$sort = _defineProperty({}, field === defaultIdKey ? idKey : field, order === 'DESC' ? -1 : 1);
        }
        Object.assign(query, params.filter ? flatten(params.filter, '', allUniqueQueryOperators) : {});
        dbg('query=%o', query);
        return service.find({ query: query });
      case _reactAdmin.GET_ONE:
        var restParams = deleteProp(params, defaultIdKey);
        return service.get(params.id, restParams);
      case _reactAdmin.UPDATE:
        if (usePatch) {
          var _data = params.previousData ? (0, _objectDiff2.default)(params.previousData, params.data) : params.data;
          return service.patch(params.id, _data);
        }
        var data = idKey !== defaultIdKey ? deleteProp(params.data, defaultIdKey) : params.data;
        return service.update(params.id, data);

      case _reactAdmin.UPDATE_MANY:
        if (usePatch) {
          var dataPatch = params.previousData ? (0, _objectDiff2.default)(params.previousData, params.data) : params.data;
          return Promise.all(params.ids.map(function (id) {
            return service.patch(id, dataPatch);
          }));
        }
        var dataUpdate = idKey !== defaultIdKey ? deleteProp(params.data, defaultIdKey) : params.data;
        return Promise.all(params.ids.map(function (id) {
          return service.update(id, dataUpdate);
        }));

      case _reactAdmin.CREATE:
        return service.create(params.data);
      case _reactAdmin.DELETE:
        return service.remove(params.id);
      case _reactAdmin.DELETE_MANY:
        if (!!options.useMulti && service.options.multi) {
          return service.remove(null, {
            query: _defineProperty({}, idKey, {
              $in: params.ids
            })
          });
        }
        return Promise.all(params.ids.map(function (id) {
          return service.remove(id);
        }));
      default:
        return Promise.reject('Unsupported FeathersJS restClient action type ' + type);
    }
  };

  var mapResponse = function mapResponse(response, type, resource, params) {
    var idKey = getIdKey({ resource: resource, options: options });
    switch (type) {
      case _reactAdmin.GET_ONE:
      case _reactAdmin.UPDATE:
      case _reactAdmin.DELETE:
        return { data: _extends({}, response, { id: response[idKey] }) };
      case _reactAdmin.UPDATE_MANY:
      case _reactAdmin.DELETE_MANY:
        return { data: response.map(function (record) {
            return record[idKey];
          }) };
      case _reactAdmin.CREATE:
        return { data: _extends({}, params.data, response, { id: response[idKey] }) };
      case _reactAdmin.GET_MANY_REFERENCE: // fix GET_MANY_REFERENCE missing id
      case _reactAdmin.GET_MANY: // fix GET_MANY missing id
      case _reactAdmin.GET_LIST:
        var res = void 0;
        // support paginated and non paginated services
        if (!response.data) {
          response.total = response.length;
          res = response;
        } else {
          res = response.data;
        }
        response.data = res.map(function (_item) {
          var item = _item;
          if (idKey !== defaultIdKey) {
            item.id = _item[idKey];
          }
          return _item;
        });
        return response;
      default:
        return response;
    }
  };

  return function (type, resource, params) {
    return mapRequest(type, resource, params).then(function (response) {
      return mapResponse(response, type, resource, params);
    });
  };
};

module.exports = exports['default'];