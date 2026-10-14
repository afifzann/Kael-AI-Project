import { requireOwner, protectRequests, showOwnerMenu } from './access';

const access = await requireOwner();
if (access) {
  protectRequests(access);
  await import('./main');
  showOwnerMenu(access);
}
