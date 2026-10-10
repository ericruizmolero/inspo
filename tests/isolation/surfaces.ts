// Every surface that can read or write a workspace's data, and how team B is kept out of team A's: one table,
// keyed by surface id, written by area in ./probes. A probe calls the real thing as B against A's ids; an
// exemption says why there is nothing to probe. tests/isolation/guard.test.ts fails when a surface on disk is
// missing here.
import type { Surface } from "./probe";
import { actions } from "./probes/actions";
import { routes } from "./probes/routes";
import { system } from "./probes/system";

export const SURFACES: Record<string, Surface> = { ...routes, ...actions, ...system };
