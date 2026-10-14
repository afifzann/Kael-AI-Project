import { requireOwner, protectRequests, showOwnerMenu } from './access';
import { setupWorkspace } from './onboarding';

const access = await requireOwner();
if (access) {
  protectRequests(access);
  await setupWorkspace();
  await import('./main');
  showOwnerMenu(access);
}
