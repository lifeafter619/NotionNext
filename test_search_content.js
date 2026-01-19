const { getPageContentText } = require('./lib/notion/getPageContentText');

const mockBlockMap = {
  block: {
    'root-id': {
      value: {
        id: 'root-id',
        type: 'page',
        content: ['block-1', 'block-2']
      }
    },
    'block-1': {
      value: {
        id: 'block-1',
        type: 'text',
        properties: {
          title: [['Hello world']]
        }
      }
    },
    'block-2': {
      value: {
        id: 'block-2',
        type: 'text',
        properties: {
          title: [['This is a test content']]
        }
      }
    }
  }
};

const mockPost = {
  id: 'root-id',
  content: ['block-1', 'block-2']
};

const text = getPageContentText(mockPost, mockBlockMap);
console.log('Extracted text:', text);
