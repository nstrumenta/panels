import { Plugin } from 'chart.js';
import { ZoomPluginOptions } from './options';

declare module 'chart.js' {
  interface PluginOptionsByType {
    zoom: ZoomPluginOptions;
  }
}

export declare const Zoom: Plugin;
