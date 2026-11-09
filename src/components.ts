/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { defineComponents } from '@iwsdk/core';
import {
  OrbitEdge,
  OrbitNode,
  OrbitPort,
  OrbitWorkspace,
} from './orbit/orbit-components.js';
import { Robot } from './robot-component.js';

export default defineComponents([
  Robot,
  OrbitNode,
  OrbitEdge,
  OrbitWorkspace,
  OrbitPort,
]);
