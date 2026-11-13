import type { FunctionReturnType } from "convex/server";
import type { api } from "@/convex/_generated/api";

/** UI types are derived from what Convex actually returns, so they can't drift. */
export type LoanView = FunctionReturnType<typeof api.loans.asBorrower>[number];
export type ToolView = FunctionReturnType<typeof api.tools.list>[number];
export type MyToolView = FunctionReturnType<typeof api.tools.mine>[number];
export type MemberView = FunctionReturnType<typeof api.admin.members>[number];
export type AutomationEventView = FunctionReturnType<typeof api.admin.automationEvents>[number];
export type LoanEvent = LoanView["events"][number];
