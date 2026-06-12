import { setupServer } from "msw/node";
import { baseHandlers } from "@/mocks/handlers";

export const server = setupServer(...baseHandlers);
