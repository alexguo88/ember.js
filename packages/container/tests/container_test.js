import { ENV } from 'ember-environment';
import { get } from 'ember-metal/property_get';
import {
  Registry,
  getOwner,
  OWNER
} from 'container';
import factory from 'container/tests/test-helpers/factory';

let originalModelInjections;

QUnit.module('Container', {
  setup() {
    originalModelInjections = ENV.MODEL_FACTORY_INJECTIONS;
  },
  teardown() {
    ENV.MODEL_FACTORY_INJECTIONS = originalModelInjections;
  }
});

QUnit.test('A registered factory returns the same instance each time', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.register('controller:post', PostController);

  let postController = container.lookup('controller:post');

  ok(postController instanceof PostController, 'The lookup is an instance of the factory');

  equal(postController, container.lookup('controller:post'));
});

QUnit.test('A registered factory is returned from lookupFactory', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.register('controller:post', PostController);

  let PostControllerFactory = container.lookupFactory('controller:post');

  ok(PostControllerFactory, 'factory is returned');
  ok(PostControllerFactory.create() instanceof  PostController, 'The return of factory.create is an instance of PostController');
});

QUnit.test('A registered factory is returned from lookupFactory is the same factory each time', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.register('controller:post', PostController);

  deepEqual(container.lookupFactory('controller:post'), container.lookupFactory('controller:post'), 'The return of lookupFactory is always the same');
});

QUnit.test('A factory returned from lookupFactory has a debugkey', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.register('controller:post', PostController);
  let PostFactory = container.lookupFactory('controller:post');
  equal(PostFactory._debugContainerKey, 'controller:post', 'factory instance receives _debugContainerKey');
});

QUnit.test('fallback for to create time injections if factory has no extend', function() {
  let registry = new Registry();
  let container = registry.container();
  let AppleController = factory();
  let PostController = factory();

  PostController.extend = undefined; // remove extend

  registry.register('controller:apple', AppleController);
  registry.register('controller:post', PostController);
  registry.injection('controller:post', 'apple', 'controller:apple');

  let postController = container.lookup('controller:post');

  equal(postController._debugContainerKey, 'controller:post', 'instance receives _debugContainerKey');
  ok(postController.apple instanceof AppleController, 'instance receives an apple of instance AppleController');
});

QUnit.test('The descendants of a factory returned from lookupFactory have a container and debugkey', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let instance;

  registry.register('controller:post', PostController);
  instance = container.lookupFactory('controller:post').create();

  equal(instance._debugContainerKey, 'controller:post', 'factory instance receives _debugContainerKey');

  ok(instance instanceof PostController, 'factory instance is instance of factory');
});

QUnit.test('A registered factory returns a fresh instance if singleton: false is passed as an option', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.register('controller:post', PostController);

  let postController1 = container.lookup('controller:post');
  let postController2 = container.lookup('controller:post', { singleton: false });
  let postController3 = container.lookup('controller:post', { singleton: false });
  let postController4 = container.lookup('controller:post');

  equal(postController1.toString(), postController4.toString(), 'Singleton factories looked up normally return the same value');
  notEqual(postController1.toString(), postController2.toString(), 'Singleton factories are not equal to factories looked up with singleton: false');
  notEqual(postController2.toString(), postController3.toString(), 'Two factories looked up with singleton: false are not equal');
  notEqual(postController3.toString(), postController4.toString(), 'A singleton factory looked up after a factory called with singleton: false is not equal');

  ok(postController1 instanceof PostController, 'All instances are instances of the registered factory');
  ok(postController2 instanceof PostController, 'All instances are instances of the registered factory');
  ok(postController3 instanceof PostController, 'All instances are instances of the registered factory');
  ok(postController4 instanceof PostController, 'All instances are instances of the registered factory');
});

QUnit.test('A factory type with a registered injection\'s instances receive that injection', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let Store = factory();

  registry.register('controller:post', PostController);
  registry.register('store:main', Store);

  registry.typeInjection('controller', 'store', 'store:main');

  let postController = container.lookup('controller:post');
  let store = container.lookup('store:main');

  equal(postController.store, store);
});

QUnit.test('An individual factory with a registered injection receives the injection', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let Store = factory();

  registry.register('controller:post', PostController);
  registry.register('store:main', Store);

  registry.injection('controller:post', 'store', 'store:main');

  let postController = container.lookup('controller:post');
  let store = container.lookup('store:main');

  equal(store._debugContainerKey, 'store:main');

  equal(postController._debugContainerKey, 'controller:post');
  equal(postController.store, store, 'has the correct store injected');
});

QUnit.test('A factory with both type and individual injections', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let Store = factory();
  let Router = factory();

  registry.register('controller:post', PostController);
  registry.register('store:main', Store);
  registry.register('router:main', Router);

  registry.injection('controller:post', 'store', 'store:main');
  registry.typeInjection('controller', 'router', 'router:main');

  let postController = container.lookup('controller:post');
  let store = container.lookup('store:main');
  let router = container.lookup('router:main');

  equal(postController.store, store);
  equal(postController.router, router);
});

QUnit.test('A factory with both type and individual factoryInjections', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let Store = factory();
  let Router = factory();

  registry.register('controller:post', PostController);
  registry.register('store:main', Store);
  registry.register('router:main', Router);

  registry.factoryInjection('controller:post', 'store', 'store:main');
  registry.factoryTypeInjection('controller', 'router', 'router:main');

  let PostControllerFactory = container.lookupFactory('controller:post');
  let store = container.lookup('store:main');
  let router = container.lookup('router:main');

  equal(PostControllerFactory.store, store, 'PostControllerFactory has the instance of store');
  equal(PostControllerFactory.router, router, 'PostControllerFactory has the route instance');
});

QUnit.test('A non-singleton instance is never cached', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostView = factory();

  registry.register('view:post', PostView, { singleton: false });

  let postView1 = container.lookup('view:post');
  let postView2 = container.lookup('view:post');

  ok(postView1 !== postView2, 'Non-singletons are not cached');
});

QUnit.test('A non-instantiated property is not instantiated', function() {
  let registry = new Registry();
  let container = registry.container();

  let template = function() {};
  registry.register('template:foo', template, { instantiate: false });
  equal(container.lookup('template:foo'), template);
});

QUnit.test('A failed lookup returns undefined', function() {
  let registry = new Registry();
  let container = registry.container();

  equal(container.lookup('doesnot:exist'), undefined);
});

QUnit.test('An invalid factory throws an error', function() {
  let registry = new Registry();
  let container = registry.container();

  registry.register('controller:foo', {});

  throws(() => {
    container.lookup('controller:foo');
  }, /Failed to create an instance of \'controller:foo\'/);
});

QUnit.test('Injecting a failed lookup raises an error', function() {
  ENV.MODEL_FACTORY_INJECTIONS = true;

  let registry = new Registry();
  let container = registry.container();

  let fooInstance = {};
  let fooFactory  = {};

  let Foo = {
    create(args) { return fooInstance; },
    extend(args) { return fooFactory;  }
  };

  registry.register('model:foo', Foo);
  registry.injection('model:foo', 'store', 'store:main');

  throws(() => {
    container.lookup('model:foo');
  });
});

QUnit.test('Injecting a falsy value does not raise an error', function() {
  let registry = new Registry();
  let container = registry.container();
  let ApplicationController = factory();

  registry.register('controller:application', ApplicationController);
  registry.register('user:current', null, { instantiate: false });
  registry.injection('controller:application', 'currentUser', 'user:current');

  strictEqual(container.lookup('controller:application').currentUser, null);
});

QUnit.test('The container returns same value each time even if the value is falsy', function() {
  let registry = new Registry();
  let container = registry.container();

  registry.register('falsy:value', null, { instantiate: false });

  strictEqual(container.lookup('falsy:value'), container.lookup('falsy:value'));
});

QUnit.test('Destroying the container destroys any cached singletons', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let PostView = factory();
  let template = function() {};

  registry.register('controller:post', PostController);
  registry.register('view:post', PostView, { singleton: false });
  registry.register('template:post', template, { instantiate: false });

  registry.injection('controller:post', 'postView', 'view:post');

  let postController = container.lookup('controller:post');
  let postView = postController.postView;

  ok(postView instanceof PostView, 'The non-singleton was injected');

  container.destroy();

  ok(postController.isDestroyed, 'Singletons are destroyed');
  ok(!postView.isDestroyed, 'Non-singletons are not destroyed');
});

QUnit.test('The container can use a registry hook to resolve factories lazily', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.resolver = {
    resolve(fullName) {
      if (fullName === 'controller:post') {
        return PostController;
      }
    }
  };

  let postController = container.lookup('controller:post');

  ok(postController instanceof PostController, 'The correct factory was provided');
});

QUnit.test('The container normalizes names before resolving', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.normalizeFullName = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  let postController = container.lookup('controller:normalized');

  ok(postController instanceof PostController, 'Normalizes the name before resolving');
});

QUnit.test('The container normalizes names when looking factory up', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.normalizeFullName = function(fullName) {
    return 'controller:post';
  };

  registry.register('controller:post', PostController);
  let fact = container.lookupFactory('controller:normalized');

  equal(fact.toString() === PostController.extend().toString(), true, 'Normalizes the name when looking factory up');
});

QUnit.test('Options can be registered that should be applied to a given factory', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostView = factory();

  registry.resolver = {
    resolve(fullName) {
      if (fullName === 'view:post') {
        return PostView;
      }
    }
  };

  registry.options('view:post', { instantiate: true, singleton: false });

  let postView1 = container.lookup('view:post');
  let postView2 = container.lookup('view:post');

  ok(postView1 instanceof PostView, 'The correct factory was provided');
  ok(postView2 instanceof PostView, 'The correct factory was provided');

  ok(postView1 !== postView2, 'The two lookups are different');
});

QUnit.test('Options can be registered that should be applied to all factories for a given type', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostView = factory();

  registry.resolver = {
    resolve(fullName) {
      if (fullName === 'view:post') {
        return PostView;
      }
    }
  };

  registry.optionsForType('view', { singleton: false });

  let postView1 = container.lookup('view:post');
  let postView2 = container.lookup('view:post');

  ok(postView1 instanceof PostView, 'The correct factory was provided');
  ok(postView2 instanceof PostView, 'The correct factory was provided');

  ok(postView1 !== postView2, 'The two lookups are different');
});

QUnit.test('An injected non-singleton instance is never cached', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostView = factory();
  let PostViewHelper = factory();

  registry.register('view:post', PostView, { singleton: false });
  registry.register('view_helper:post', PostViewHelper, { singleton: false });
  registry.injection('view:post', 'viewHelper', 'view_helper:post');

  let postView1 = container.lookup('view:post');
  let postView2 = container.lookup('view:post');

  ok(postView1.viewHelper !== postView2.viewHelper, 'Injected non-singletons are not cached');
});

QUnit.test('Factory resolves are cached', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let resolveWasCalled = [];
  registry.resolve = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  container.lookupFactory('controller:post');
  deepEqual(resolveWasCalled, ['controller:post']);

  container.lookupFactory('controller:post');
  deepEqual(resolveWasCalled, ['controller:post']);
});

QUnit.test('factory for non extendables (MODEL) resolves are cached', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  let resolveWasCalled = [];
  registry.resolve = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  container.lookupFactory('model:post');
  deepEqual(resolveWasCalled, ['model:post']);

  container.lookupFactory('model:post');
  deepEqual(resolveWasCalled, ['model:post']);
});

QUnit.test('factory for non extendables resolves are cached', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = {};
  let resolveWasCalled = [];

  registry.resolve = function(fullName) {
    resolveWasCalled.push(fullName);
    return PostController;
  };

  deepEqual(resolveWasCalled, []);
  container.lookupFactory('foo:post');
  deepEqual(resolveWasCalled, ['foo:post']);

  container.lookupFactory('foo:post');
  deepEqual(resolveWasCalled, ['foo:post']);
});

QUnit.test('The `_onLookup` hook is called on factories when looked up the first time', function() {
  expect(2);

  let registry = new Registry();
  let container = registry.container();
  let Apple = factory();

  Apple.reopenClass({
    _onLookup(fullName) {
      equal(fullName, 'apple:main', 'calls lazy injection method with the lookup full name');
      equal(this, Apple, 'calls lazy injection method in the factory context');
    }
  });

  registry.register('apple:main', Apple);

  container.lookupFactory('apple:main');
  container.lookupFactory('apple:main');
});

QUnit.test('A factory\'s lazy injections are validated when first instantiated', function() {
  let registry = new Registry();
  let container = registry.container();
  let Apple = factory();
  let Orange = factory();

  Apple.reopenClass({
    _lazyInjections() {
      return ['orange:main', 'banana:main'];
    }
  });

  registry.register('apple:main', Apple);
  registry.register('orange:main', Orange);

  throws(() => {
    container.lookup('apple:main');
  }, /Attempting to inject an unknown injection: 'banana:main'/);
});

QUnit.test('Lazy injection validations are cached', function() {
  expect(1);

  let registry = new Registry();
  let container = registry.container();
  let Apple = factory();
  let Orange = factory();

  Apple.reopenClass({
    _lazyInjections() {
      ok(true, 'should call lazy injection method');
      return ['orange:main'];
    }
  });

  registry.register('apple:main', Apple);
  registry.register('orange:main', Orange);

  container.lookup('apple:main');
  container.lookup('apple:main');
});

QUnit.test('An object with its owner pre-set should be returned from ownerInjection', function() {
  let owner = { };
  let registry = new Registry();
  let container = registry.container({ owner });

  let result = container.ownerInjection();

  equal(result[OWNER], owner, 'owner is properly included');
});

QUnit.test('A deprecated `container` property is appended to every object instantiated from an extendable factory', function() {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();
  registry.register('controller:post', PostController);
  let postController = container.lookup('controller:post');

  expectDeprecation(() => {
    get(postController, 'container');
  }, 'Using the injected `container` is deprecated. Please use the `getOwner` helper instead to access the owner of this object.');

  expectDeprecation(() => {
    let c = postController.container;
    strictEqual(c, container);
  }, 'Using the injected `container` is deprecated. Please use the `getOwner` helper instead to access the owner of this object.');
});

QUnit.test('A deprecated `container` property is appended to every object instantiated from a non-extendable factory, and a fake container is available during instantiation.', function() {
  expect(8);

  let owner = {};
  let registry = new Registry();
  let container = registry.container({ owner });

  // Define a simple non-extendable factory
  function PostController(options) {
    this.container = options.container;
  }

  PostController.create = function(options) {
    ok(options.container, 'fake container has been injected and is available during `create`.');

    expectDeprecation(() => {
      options.container.lookup('abc:one');
    }, 'Using the injected `container` is deprecated. Please use the `getOwner` helper to access the owner of this object and then call `lookup` instead.');

    expectDeprecation(() => {
      options.container.lookupFactory('abc:two');
    }, 'Using the injected `container` is deprecated. Please use the `getOwner` helper to access the owner of this object and then call `_lookupFactory` instead.');

    // non-deprecated usage of `lookup` and `_lookupFactory`
    owner.lookup = function(fullName) {
      equal(fullName, 'abc:one', 'lookup on owner called properly');
    };
    owner._lookupFactory = function(fullName) {
      equal(fullName, 'abc:two', '_lookupFactory on owner called properly');
    };
    let foundOwner = getOwner(options);
    foundOwner.lookup('abc:one');
    foundOwner._lookupFactory('abc:two');

    return new PostController(options);
  };

  registry.register('controller:post', PostController);
  let postController = container.lookup('controller:post');

  expectDeprecation(() => {
    get(postController, 'container');
  }, 'Using the injected `container` is deprecated. Please use the `getOwner` helper instead to access the owner of this object.');

  expectDeprecation(() => {
    let c = postController.container;
    strictEqual(c, container, 'Injected container is now regular (not fake) container, but access is still deprecated.');
  }, 'Using the injected `container` is deprecated. Please use the `getOwner` helper instead to access the owner of this object.');
});

QUnit.test('A deprecated `container` property is only set on a non-extendable factory instance if `container` is present and writable.', function() {
  expect(2);

  let owner = {};
  let registry = new Registry();
  let container = registry.container({ owner });

  // Define a non-extendable factory that is frozen after `create`
  let PostController = function() {};
  PostController.create = function() {
    let instance = new PostController();

    Object.seal(instance);

    return instance;
  };

  registry.register('controller:post', PostController);
  let postController = container.lookup('controller:post');

  equal(postController.container, undefined, 'container was not added');

  let OtherController = function() {
    this.container = 'foo';
  };

  OtherController.create = function() {
    let instance = new OtherController();

    Object.freeze(instance);

    return instance;
  };

  registry.register('controller:other', OtherController);
  let otherController = container.lookup('controller:other');

  equal(otherController.container, 'foo', 'container was not added');
});

QUnit.test('An extendable factory can provide `container` upon create, with a deprecation', function(assert) {
  let registry = new Registry();
  let container = registry.container();

  registry.register('controller:post', factory());

  let PostController = container.lookupFactory('controller:post');

  let postController;

  expectDeprecation(() => {
    postController = PostController.create({
      container: 'foo'
    });
  }, /Providing the \`container\` property to .+ is deprecated. Please use \`Ember.setOwner\` or \`owner.ownerInjection\(\)\` instead to provide an owner to the instance being created/);

  expectDeprecation(() => {
    let c = postController.container;
    assert.equal(c, 'foo', 'the `container` provided to `.create`was used');
  }, 'Using the injected `container` is deprecated. Please use the `getOwner` helper instead to access the owner of this object.');
});

QUnit.test('lookupFactory passes options through to expandlocallookup', function(assert) {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.register('controller:post', PostController);

  registry.expandLocalLookup = function(fullName, options) {
    assert.ok(true, 'expandLocalLookup was called');
    assert.equal(fullName, 'foo:bar');
    assert.deepEqual(options, { source: 'baz:qux' });

    return 'controller:post';
  };

  let PostControllerFactory = container.lookupFactory('foo:bar', { source: 'baz:qux' });

  assert.ok(PostControllerFactory.create() instanceof  PostController, 'The return of factory.create is an instance of PostController');
});

QUnit.test('lookup passes options through to expandlocallookup', function(assert) {
  let registry = new Registry();
  let container = registry.container();
  let PostController = factory();

  registry.register('controller:post', PostController);

  registry.expandLocalLookup = function(fullName, options) {
    assert.ok(true, 'expandLocalLookup was called');
    assert.equal(fullName, 'foo:bar');
    assert.deepEqual(options, { source: 'baz:qux' });

    return 'controller:post';
  };

  let PostControllerLookupResult = container.lookup('foo:bar', { source: 'baz:qux' });

  assert.ok(PostControllerLookupResult instanceof PostController);
});
