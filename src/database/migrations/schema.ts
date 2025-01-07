import { pgTable, uuid, text, integer, numeric, timestamp, unique, jsonb, foreignKey, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const productStatus = pgEnum("product_status", ['draft', 'active', 'inactive'])
export const receiptImportStatus = pgEnum("receipt_import_status", ['draft', 'processing', 'completed', 'cancelled', 'short_received', 'over_received'])
export const receiptReturnStatus = pgEnum("receipt_return_status", ['draft', 'processing', 'completed', 'cancelled'])
export const receiptReturnType = pgEnum("receipt_return_type", ['customer', 'supplier'])
export const userStatus = pgEnum("user_status", ['active', 'inactive'])


export const receiptItems = pgTable("receipt_items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	receiptId: uuid("receipt_id").notNull(),
	productId: uuid("product_id").notNull(),
	productCode: text("product_code").notNull(),
	productName: text("product_name").notNull(),
	quantity: integer().notNull(),
	costPrice: numeric("cost_price"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
});

export const products = pgTable("products", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	index: integer(),
	productCode: text("product_code"),
	productName: text("product_name").notNull(),
	sellingPrice: numeric("selling_price"),
	costPrice: numeric("cost_price"),
	inventory: integer(),
	unit: text(),
	category: text(),
	supplier: text(),
	additionalDescription: text("additional_description"),
	imageUrls: text("image_urls").array().default(["RAY"]),
	warehouseLocation: text("warehouse_location"),
	status: productStatus().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}, (table) => [
	unique("products_index_unique").on(table.index),
	unique("products_product_code_unique").on(table.productCode),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	username: text(),
	password: text(),
	salt: text(),
	fullname: text(),
	phone: text(),
	role: text(),
	storeCode: text("store_code"),
	status: userStatus().notNull(),
	tokenVersion: text("token_version"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const roles = pgTable("roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("roles_name_unique").on(table.name),
]);

export const receiptImports = pgTable("receipt_imports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	receiptNumber: text("receipt_number"),
	note: text(),
	quantity: integer(),
	totalProduct: integer("total_product"),
	totalAmount: numeric("total_amount"),
	supplier: text(),
	warehouseLocation: text("warehouse_location"),
	paymentDate: timestamp("payment_date", { mode: 'string' }),
	expectedImportDate: timestamp("expected_import_date", { mode: 'string' }),
	status: receiptImportStatus().notNull(),
	userCreated: uuid("user_created").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	statusChangeLogs: jsonb("status_change_logs"),
}, (table) => [
	unique("receipt_imports_receipt_number_unique").on(table.receiptNumber),
]);

export const receiptReturns = pgTable("receipt_returns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	receiptNumber: text("receipt_number"),
	name: text(),
	note: text(),
	quantity: integer().notNull(),
	totalProduct: integer("total_product").notNull(),
	totalAmount: numeric("total_amount").notNull(),
	reason: text(),
	warehouseLocation: text("warehouse_location"),
	status: receiptReturnStatus().notNull(),
	type: receiptReturnType().notNull(),
	returnDate: timestamp("return_date", { mode: 'string' }),
	userCreated: uuid("user_created").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
}, (table) => [
	unique("receipt_returns_receipt_number_unique").on(table.receiptNumber),
]);

export const userRoles = pgTable("user_roles", {
	userId: uuid("user_id").notNull(),
	roleId: uuid("role_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_roles_role_id_roles_id_fk"
		}),
	primaryKey({ columns: [table.userId, table.roleId], name: "user_roles_user_id_role_id_pk"}),
]);
