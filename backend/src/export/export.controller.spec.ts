import { ROLES_KEY } from '../auth/roles.decorator';
import { ExportController } from './export.controller';

describe('ExportController authorization metadata', () => {
  it('requires admin role for all export routes', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, ExportController) as
      | string[]
      | undefined;

    expect(roles).toEqual(['admin']);
  });
});
