import { init as canvasBg } from './canvas-bg.js';
import { init as mouseFollow } from './mouse-follow.js';
import { init as scrollCascade } from './scroll-cascade.js';
import { init as contact } from './contact.js';

canvasBg();
mouseFollow('#card');
scrollCascade();
contact('#saveContactBtn');
