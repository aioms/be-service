export enum Environment {
  DOCKER = "docker",
  DEVELOPMENT = "development",
  PRODUCTION = "production",
}

export enum StoreCode {
  KS1 = "KS1",
  KS2 = "KS2",
  KH = "KH",
}

export enum CacheExpiry {
  Minutes = 60,
  Hour = 60 * 60,
  Day = 60 * 60 * 24,
  Week = 60 * 60 * 24 * 7,
  Month = 60 * 60 * 24 * 30,
}

export enum HttpStatusCode {
  Ok = 200,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalServerError = 500,
}

export enum CommonStatus {
  Active = "active",
  Inactive = "inactive",
  Deleted = "deleted",
}