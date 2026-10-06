import { defineDashboardExtension } from '@vendure/dashboard';
import { SignInMark } from './sign-in-mark.js';

defineDashboardExtension({
  login: { logo: { component: SignInMark } },
});
