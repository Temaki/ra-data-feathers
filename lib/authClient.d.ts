declare function _default(client: any, options?: {
    storageKey?: string;
    authenticate?: {
        strategy: string;
    };
    permissionKey?: string;
    permissionField?: string;
    passwordField?: string;
    usernameField?: string;
    redirectTo?: string;
    logoutOnForbidden?: boolean;
}): (type: any, params: any) => any;
export default _default;
