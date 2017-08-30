'use strict';

const imageUrl = require('./yolo.png');
const stateful = require('./stateful');

module.exports = '<img src="' + imageUrl + '" alt="' + stateful.value + '" />';
