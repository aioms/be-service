import { StoreCode } from "../../../common/enums/index.ts";
import { PaginationParams } from "../../../common/types/pagination.d.ts";
import { UserStatus } from "../../../database/enums/user.enum.ts";

export interface CreateUserDto {
  username: string;
  password: string;
  fullname: string;
  phone: string;
  role: string;
  storeCode: StoreCode;
  status: UserStatus;
}

export interface UpdateUserDto {
  id: string;
  password: string;
  fullname: string;
  phone: string;
  role: string;
  storeCode: StoreCode;
  status: UserStatus;
}

export interface GetUsersDto extends PaginationParams {
  keyword: string;
  status: string;
}
