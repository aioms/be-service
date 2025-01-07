import { relations } from "drizzle-orm/relations";
import { users, userRoles, roles } from "./schema";

export const userRolesRelations = relations(userRoles, ({one}) => ({
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userRoles: many(userRoles),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	userRoles: many(userRoles),
}));