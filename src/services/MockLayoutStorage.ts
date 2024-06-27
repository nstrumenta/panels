// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { ILayoutStorage, Layout } from '@base/services/ILayoutStorage';

// ts-prune-ignore-next
export default class MockLayoutStorage implements ILayoutStorage {
  private layoutsById: Map<string, Layout>;

  public constructor(layouts: Layout[] = []) {
    this.layoutsById = new Map(layouts.map((layout) => [layout.id, layout]));
  }

  public async list(): Promise<readonly Layout[]> {
    return Array.from(this.layoutsById.values());
  }

  public async get(id: string): Promise<Layout | undefined> {
    return this.layoutsById.get(id);
  }

  public async put(layout: Layout): Promise<Layout> {
    this.layoutsById.set(layout.id, layout);
    return layout;
  }

  public async delete(id: string): Promise<void> {
    this.layoutsById.delete(id);
  }

  public async importLayouts(): Promise<void> {}
}
