export interface RelationshipResponse {
  relationshipId: string;
  name: string;
  isGlobal: boolean;
  active: boolean;
}

export interface RelationshipRequest {
  name: string;
}
