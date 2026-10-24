export function preserveText(value:unknown,limit:number):string;
export function eligibleFollowup(original:{client_id:string;opportunity_id:string|null;source_time:string|Date}|null,next:{client_id:string;opportunity_id:string|null;happened_at:string|Date}|null):boolean;
export function escapeLike(value:string):string;
export function validOffsetDateTime(value:unknown):boolean;
