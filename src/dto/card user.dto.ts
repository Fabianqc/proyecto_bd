import { IsDefined, IsBoolean, IsUUID } from "class-validator";

export class CardUser {
  @IsBoolean()
  @IsDefined()
  is_owner: boolean;

  @IsUUID()
  @IsDefined()
  card_id: string;

  @IsDefined()
  @IsUUID()
  userid: string;
}
