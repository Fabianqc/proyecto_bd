import { IsDefined, IsBoolean, IsUUID } from "class-validator";

export class BoardUser {
  @IsUUID()
  @IsDefined()
  boardId: string;

  @IsUUID()
  @IsDefined()
  userId: string;

  @IsDefined()
  @IsBoolean()
  isAdmin: boolean;
}
