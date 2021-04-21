declare function _default(client: any, options?: {
    usePatch?: boolean;
    customQueryOperators?: string[];
    useMulti?: boolean;
    id?: string;
} & {
    [Key: string]: {
        id: string;
    };
}): (type: any, resource: any, params: any) => any;
export default _default;
