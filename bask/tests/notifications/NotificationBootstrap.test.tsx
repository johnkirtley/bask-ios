// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

import NotificationBootstrap from '@/components/NotificationBootstrap';
import { notificationService } from '@/lib/services/notificationService';
import { resetBackend } from '../_setup/capacitorMocks';

describe('NotificationBootstrap', () => {
  beforeEach(() => resetBackend());

  it('renders nothing', () => {
    const { container } = render(React.createElement(NotificationBootstrap));
    expect(container).toBeEmptyDOMElement();
  });

  it('calls registerHandlers on mount', async () => {
    const spy = vi.spyOn(notificationService, 'registerHandlers').mockResolvedValue(undefined);
    render(React.createElement(NotificationBootstrap));
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('does not crash if registerHandlers rejects (fire-and-forget void)', async () => {
    const spy = vi.spyOn(notificationService, 'registerHandlers').mockRejectedValue(new Error('boom'));
    const { container } = render(React.createElement(NotificationBootstrap));
    expect(container).toBeEmptyDOMElement();
    spy.mockRestore();
  });
});
