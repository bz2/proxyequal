import {expect} from 'chai';

import {proxyState, proxyShallow, proxyEqual, drainDifference, deproxify, isProxyfied, getProxyKey} from '../src/index';

describe('proxy', () => {
  it('arrays', () => {
    const A1 = [0, 1, 2, 3];
    const A2 = [0, 1, 2, 3];
    const A3 = A1.map(a => a)
    const A4 = A1.map(a => a * 2)

    const trapped = proxyState(A1);

    expect(trapped.affected).to.be.deep.equal([]);

    expect(proxyShallow(A1, A2, trapped.affected)).to.be.true;

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A3, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A4, trapped.affected)).to.be.true;


    trapped.state[0] += 0;
    trapped.state[0] += 0;

    expect(trapped.affected).to.be.deep.equal(['.0']);

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A3, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A4, trapped.affected)).to.be.true;

    trapped.state[1] += 0;

    expect(trapped.affected).to.be.deep.equal(['.0', '.1']);

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A3, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A4, trapped.affected)).to.be.false;

    expect(drainDifference()).to.be.deep.equal([['.1', 'differs', 1, 2]]);
  });

  it('objects', () => {
    const A1 = {
      key1: 1,
      key2: {
        array: [1, 2, 4]
      },
      key3: null
    };
    const A2 = {
      key1: 1,
      key2: 2
    };
    const A3 = Object.assign({}, A1, {
      key1: 2,
    });
    const A4 = {
      key1: 1,
      key2: {
        array: [1, 2, 4]
      }
    };

    const trapped = proxyState(A1);
    expect(trapped.affected).to.be.deep.equal([]);

    expect(proxyShallow(A1, A2, trapped.affected)).to.be.true;
    expect(proxyShallow(A1, A3, trapped.affected)).to.be.true;

    trapped.state.key1 += 0;
    trapped.state.key1 += 0;
    expect(trapped.affected).to.be.deep.equal(['.key1']);

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A3, trapped.affected)).to.be.false;
    expect(drainDifference()).to.be.deep.equal([['.key1', 'differs', 1, 2]]);

    trapped.reset();
    expect(trapped.affected).to.be.deep.equal([]);
    trapped.state.key2.array[0] += 0;
    expect(trapped.affected).to.be.deep.equal(['.key2', '.key2.array', '.key2.array.0']);

    expect(proxyEqual(A1, A2, trapped.affected)).to.be.false;
    expect(drainDifference()).to.be.deep.equal([['.key2.array.0', 'differs', 1, undefined]]);

    expect(proxyEqual(A1, A3, trapped.affected)).to.be.true;
    expect(proxyEqual(A1, A4, trapped.affected)).to.be.true;

    expect(proxyShallow(A1, A3, trapped.affected)).to.be.true;
    expect(proxyShallow(A1, A4, trapped.affected)).to.be.false;
    expect(drainDifference()).to.be.deep.equal([['.key2', 'differs', A1.key2, A4.key2]]);
  });

  it('handle empty case', () => {
    const A = {
      a: undefined
    };
    expect(proxyState(A).state.a).to.be.equal(undefined);
    expect(proxyState(undefined).state).to.be.equal(undefined);
  });

  it('can proxy proxy', () => {
    const A = {
      b: {
        c: {
          d: 1
        }
      }
    };
    const p1 = proxyState(A);
    const p2 = proxyState(p1.state.b);

    expect(proxyEqual(p1.state, A, ['.b'])).to.be.true;
    expect(proxyEqual(p1.state.b, A.b, ['.c'])).to.be.true;

    expect(proxyEqual(p2.state, A.b, ['.c'])).to.be.true;
  });

  it('shallow equal test', () => {
    const C = {c: 1};
    const A1 = {
      b: C
    };
    const A2 = {
      b: C
    };

    expect(proxyState(A1).state.b).not.to.equal(proxyState(A2).state.b);

    const p1 = proxyState(A1);
    const s1 = p1.state;
    const p2 = p1.replaceState(A2);
    const s2 = p2.state;

    expect(s1.b).to.equal(s2.b);
  });

  it('handles freezed objects', () => {
    const O1 = {
      a: 1,
      b: 2,
      c: {d: 4}
    };
    const O2 = Object.freeze(O1);

    const trapped = proxyState(O2);
    const state = trapped.state;
    const read = state.a + state.b + state.c.d;
    expect(read).to.be.equal(7);
    expect(trapped.affected).to.be.deep.equal(['.a', '.b', '.c', '.c.d']);

  });

  it('should return proxy name', () => {
    var A = {a: {b: {c: 1}}};
    var P = proxyState(A, 'key1').state;
    expect(P.a.b).to.be.deep.equal({c: 1})
    expect(getProxyKey(P.a).fingerPrint).to.be.equal('key1');
    expect(getProxyKey(P.a).suffix).to.be.equal('.a');
    expect(getProxyKey(P.a.b).suffix).to.be.equal('.a.b');
    expect(getProxyKey(P.a.b.c).suffix).to.be.equal(undefined);
  })

  it('detect self', () => {
    const A = {a: 1};
    const B = proxyState(A).state;
    const C = deproxify(B);

    expect(isProxyfied(A)).to.be.false;
    expect(isProxyfied(B)).to.be.true;
    expect(isProxyfied(C)).to.be.false;
  });
});