import { describe, expect, it } from 'vitest';
import {
  createApplicationSchema,
  isPublicImageReference,
} from '../../../../packages/validation/src/index';
import { deployConflict } from './application.rules';

const DIGEST =
  'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

describe('public image references', () => {
  it('accepts a public reference with a tag or digest', () => {
    expect(isPublicImageReference('docker.io/library/nginx:1.27')).toBe(true);
    expect(isPublicImageReference('ghcr.io/customer/example-app:1.4')).toBe(true);
    expect(isPublicImageReference('nginx:1.27')).toBe(true);
    expect(isPublicImageReference('nginx:latest')).toBe(true);
    expect(isPublicImageReference('localhost:5000/team/app:1')).toBe(true);
    expect(isPublicImageReference(`docker.io/library/nginx@${DIGEST}`)).toBe(true);
  });

  it('rejects implicit latest, credentials, and non-image strings', () => {
    expect(isPublicImageReference('nginx')).toBe(false);
    expect(isPublicImageReference('http://docker.io/library/nginx:1.27')).toBe(false);
    expect(isPublicImageReference('user:pass@ghcr.io/customer/app:1')).toBe(false);
    expect(isPublicImageReference('NGINX:1')).toBe(false);
    expect(isPublicImageReference('docker.io/library/nginx:')).toBe(false);
    expect(isPublicImageReference('library/nginx:1.27 ')).toBe(false);
  });
});

describe('create application body', () => {
  it('accepts name, image, and port', () => {
    const parsed = createApplicationSchema.parse({
      name: 'web',
      image: 'docker.io/library/nginx:1.27',
      containerPort: 80,
    });
    expect(parsed.name).toBe('web');
  });

  it('rejects extra fields and a private-looking reference', () => {
    expect(() =>
      createApplicationSchema.parse({
        name: 'web',
        image: 'docker.io/library/nginx:1.27',
        containerPort: 80,
        password: 'secret',
      }),
    ).toThrow();
    expect(() =>
      createApplicationSchema.parse({
        name: '-web',
        image: 'nginx',
        containerPort: 80,
      }),
    ).toThrow();
  });
});

describe('deploy conflict', () => {
  it('allows a new deploy from a settled state', () => {
    expect(deployConflict('CREATED')).toBeNull();
    expect(deployConflict('FAILED')).toBeNull();
    expect(deployConflict('RUNNING')).toBeNull();
    expect(deployConflict('STOPPED')).toBeNull();
  });

  it('blocks a deploy that is already moving', () => {
    expect(deployConflict('DEPLOYING')).toMatch(/already deploying/);
    expect(deployConflict('DELETING')).toMatch(/being deleted/);
  });
});
