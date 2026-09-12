import { ROLES_KEY } from '../auth/roles.decorator';
import { UsersController } from './users.controller';

describe('UsersController authorization metadata', () => {
  it.each([
    ['findAll'],
    ['findPending'],
    ['findOne'],
    ['approve'],
    ['reject'],
    ['remove'],
  ] as const)('%s requires admin role', (methodName) => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      UsersController.prototype[methodName],
    ) as string[] | undefined;

    expect(roles).toEqual(['admin']);
  });
});
