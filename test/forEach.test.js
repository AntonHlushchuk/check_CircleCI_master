/**
 * @jest-environment jest-environment-jsdom-fourteen
 */

describe('for', () => {
   const timer = 10000000000;
   let result = 0;
   it('should run 10000000000 time', () => {

      for(let i = 0; i < timer; i++) {
         result += 1;
      }

      expect(result).toEqual(10000000000);
   });
});