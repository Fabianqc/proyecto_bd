import { IsDefined, IsString, IsUUID, IsOptional, isDefined } from "class-validator";

export class card {
  @IsString()
  @IsDefined()
  title:string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  due_date?: Date;

  @IsUUID()
  @IsDefined()
  list_id: string;
}
