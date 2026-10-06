/*
 * The part of @vendure/dashboard's extension API this folder calls, for the type
 * check only: the build links the real module. The package ships that API as
 * source for the dashboard's own build to compile, with no declarations, and its
 * thousand files fail this repository's compiler settings on code that is not
 * ours. The shape is Vendure's documented DashboardLoginExtensions (since 3.4);
 * the e2e check on the sign-in page sees what it does.
 */
import type { ComponentType } from 'react';

export interface DashboardExtension {
  login?: {
    logo?: { component: ComponentType };
  };
}

export function defineDashboardExtension(extension: DashboardExtension): void;
