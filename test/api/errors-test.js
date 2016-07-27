/* global describe, it */

import errors from '../../src/middleware/json-api/res-errors'
import expect from 'expect.js'

/*
 *   Note: The axios ajax response attaches the actual response data to
 *         `res.data`, including error responses.
 */
describe('error processing', () => {
  it('should process errors that contain a pointer and a title', () => {
    let mockResponse = {
      data: {
        errors: [{
          title: 'has already been taken',
          detail: 'name - has already been taken',
          code: 'VALIDATION_ERROR',
          source: {
            pointer: '/data/attributes/name'
          },
          status: '422'
        }]
      }
    }
    let result = errors.error(mockResponse)
    expect(result.name).to.eql('has already been taken')
  })
})
