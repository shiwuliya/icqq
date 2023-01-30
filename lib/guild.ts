import {Client} from "./client";

export class Guild{
    protected guild_id?:string
    protected guild_name?:string
    constructor(protected c:Client) {
    }
}