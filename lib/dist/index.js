const generateId = () => Math.random().toString(36).substr(2, 9);

class Observable {
    constructor(value) {
        this.value = value;
        this._subscribersQueue = {};
    }
    get getValue() {
        return this.value;
    }
    subscribe(listener) {
        const id = generateId();
        this._subscribersQueue[id] = listener;
        listener(this.getValue);
        return () => {
            delete this._subscribersQueue[id];
        };
    }
    setValue(newValue) {
        this.value = newValue;
        for (const key in this._subscribersQueue) {
            const subscriber = this._subscribersQueue[key];
            subscriber(this.value);
        }
    }
}

function decode(str) {
    try {
        return decodeURIComponent(str);
    }
    catch (err) {
        console.warn(`[Easyroute] Could not decode query string: ${str}`);
    }
    return str;
}
function parseQuery(query) {
    const res = {};
    if (typeof query !== 'string')
        return res;
    query = query.trim().replace(/^(\?|#|&)/, '');
    if (!query) {
        return res;
    }
    query.split('&').forEach((param) => {
        const parts = param.replace(/\+/g, ' ').split('=');
        const key = decode(parts.shift());
        const val = parts.length > 0 ? decode(parts.join('=')) : null;
        if (res[key] === undefined) {
            res[key] = val;
        }
        else if (Array.isArray(res[key])) {
            val !== null && res[key].push(val);
        }
        else {
            if (val !== null) {
                res[key] = [res[key], val];
            }
        }
    });
    return res;
}

const getMaxDepth = (array, depthKey = 'nestingDepth') => Math.max(...array.map((e) => e[depthKey]));

class UrlParser {
    static getQueryParams(queryString) {
        return parseQuery(queryString);
    }
    static getPathParams(matchedRoute, url) {
        let pathValues = matchedRoute.regexpPath.exec(url);
        if (!pathValues)
            return {};
        pathValues = pathValues.slice(1, pathValues.length);
        const urlParams = {};
        for (let pathPart = 0; pathPart < pathValues.length; pathPart++) {
            const value = pathValues[pathPart];
            const key = matchedRoute.pathKeys[pathPart];
            urlParams[String(key)] = value;
        }
        return urlParams;
    }
    static createRouteObject(matchedRoutes, url) {
        var _a;
        matchedRoutes = matchedRoutes.filter(Boolean);
        const currentMatched = matchedRoutes.find((route) => route.nestingDepth === getMaxDepth(matchedRoutes));
        const [pathString, queryString] = url.split('?');
        if (currentMatched) {
            const pathParams = UrlParser.getPathParams(currentMatched, pathString);
            const queryParams = UrlParser.getQueryParams(queryString);
            return {
                params: pathParams,
                query: queryParams,
                name: currentMatched.name,
                fullPath: url,
                meta: (_a = currentMatched.meta) !== null && _a !== void 0 ? _a : {}
            };
        }
        return {
            params: {},
            query: {},
            fullPath: ''
        };
    }
}

class SilentModeService {
    constructor(firstRoute) {
        this.history = [];
        this.currentHistoryPosition = 0;
        this.appendHistory(firstRoute);
    }
    appendHistory(data) {
        if (Array.isArray(data)) {
            this.history.push(...data);
            this.currentHistoryPosition += data.length;
        }
        else {
            this.history.push(data);
            this.currentHistoryPosition++;
        }
    }
    back() {
        return this.go(-1);
    }
    go(howFar) {
        var _a, _b;
        const goResult = this.currentHistoryPosition + howFar;
        const previousObject = this.history[goResult];
        if (previousObject) {
            this.currentHistoryPosition = goResult;
            return (_a = previousObject === null || previousObject === void 0 ? void 0 : previousObject.fullPath) !== null && _a !== void 0 ? _a : '';
        }
        return (_b = this.history[0].fullPath) !== null && _b !== void 0 ? _b : '';
    }
}

const stripBase = (url, base) => Boolean(base) ? url.replace(base, '') : url;

const deleteLastSlash = (url) => url.replace(/\/$/, '');

function setHistoryMode() {
    this.parseRoute(stripBase(`${deleteLastSlash(window.location.pathname)}/${window.location.search}`, this.base), true);
    window.addEventListener('popstate', (ev) => {
        ev.state
            ? this.parseRoute(stripBase(ev.state.url, this.base), false)
            : this.parseRoute('/', false);
    });
}

function setHashMode() {
    this.parseRoute(stripBase(window.location.hash, this.base) || '/');
    window.addEventListener('hashchange', () => {
        if (this.ignoreEvents) {
            this.ignoreEvents = false;
            return;
        }
        this.parseRoute(stripBase(window.location.hash, this.base));
    });
}

async function checkAsyncAndDownload(component) {
    const isAsync = /(\.then|import\(.+\)|vitePreload|_+import_+)/i.test(component.toString());
    if (!isAsync)
        return component;
    else {
        try {
            const newComponent = await component();
            return newComponent.default;
        }
        catch (e) {
            console.warn(`[Easyroute] caught an error while trying to download async component: "${e.message}"`);
            return component;
        }
    }
}

async function downloadDynamicComponents(matchedRoutes) {
    const nonDynamic = matchedRoutes.map(async (route) => {
        if (route.component) {
            route.component = await checkAsyncAndDownload(route.component);
        }
        if (route.components) {
            for await (const component of Object.entries(route.components)) {
                const [key, value] = component;
                route.components[key] = await checkAsyncAndDownload(value);
            }
        }
        return route;
    });
    return await Promise.all(nonDynamic);
}

/**
 * @description Get durations of CSS transition (enter and leave)
 * @param {string} transitionName
 * @returns {{leavingDuration: number, enteringDuration: number}}
 */

/**
 * @description Delay for async functions
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

/**
 * @description Is current environment - browser
 * @author flexdinesh/browser-or-node
 * @returns {boolean}
 */
function isBrowser() {
  return (
    typeof window !== 'undefined' && typeof window.document !== 'undefined'
  );
}

function getRoutesTreeChain(allRoutes, currentRoute) {
    var _a;
    if (!currentRoute)
        return [];
    const tree = [currentRoute];
    let currentSeekingId = currentRoute.parentId;
    do {
        const seed = allRoutes.find((seedRoute) => seedRoute.id === currentSeekingId);
        seed && tree.push(seed);
        currentSeekingId = (_a = seed === null || seed === void 0 ? void 0 : seed.parentId) !== null && _a !== void 0 ? _a : null;
    } while (currentSeekingId);
    return tree;
}
function parseRoutes(routes, url) {
    const allMatched = [];
    const usedIds = [];
    const usedDepths = [];
    routes.forEach((route) => {
        if (route.regexpPath.test(url)) {
            allMatched.push(...getRoutesTreeChain(routes, route));
        }
    });
    return allMatched.filter((route) => {
        if (!usedIds.includes(route.id) &&
            !usedDepths.includes(route.nestingDepth)) {
            usedIds.push(route.id);
            usedDepths.push(route.nestingDepth);
            return true;
        }
        return false;
    });
}

const deleteFirstSlash = (url) => url.replace(/^\//, '');

const deleteEdgeSlashes = (url) => deleteFirstSlash(deleteLastSlash(url));

function regexparam (str, loose) {
	if (str instanceof RegExp) return { keys:false, pattern:str };
	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
	arr[0] || arr.shift();

	while (tmp = arr.shift()) {
		c = tmp[0];
		if (c === '*') {
			keys.push('wild');
			pattern += '/(.*)';
		} else if (c === ':') {
			o = tmp.indexOf('?', 1);
			ext = tmp.indexOf('.', 1);
			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
		} else {
			pattern += '/' + tmp;
		}
	}

	return {
		keys: keys,
		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
	};
}

function getMatchData(arr, parentId = null, nestingDepth = 0, parentPath = '/') {
    return arr.reduce((acc, val) => {
        var _a;
        const componentPart = (val.component && { component: val.component }) ||
            (val.components && { components: val.components });
        const path = deleteEdgeSlashes(parentPath) + '/' + deleteEdgeSlashes(val.path);
        const { pattern, keys } = regexparam(path);
        const newRoute = {
            ...val,
            ...componentPart,
            parentId,
            nestingDepth,
            path,
            id: generateId(),
            regexpPath: pattern,
            pathKeys: keys
        };
        if (Array.isArray(val.children)) {
            acc = acc.concat(getMatchData(((_a = newRoute.children) !== null && _a !== void 0 ? _a : []), newRoute.id, nestingDepth + 1, newRoute.path));
        }
        return acc.concat(newRoute);
    }, []);
}

const deleteQueryTrailingSlash = (url) => url.replace(/(\/\?)/, '?');

function constructUrl(url, base, omitTrailing = false) {
    omitTrailing &&
        url.split('?')[0].length > 1 &&
        (url = deleteQueryTrailingSlash(deleteLastSlash(url)));
    if (!base || url.includes(base))
        return url;
    return `/${deleteLastSlash(base)}/${deleteFirstSlash(url)}`;
}

const SSR = !isBrowser();
class Router {
    constructor(settings) {
        this.settings = settings;
        this.routes = [];
        this.ignoreEvents = false;
        this.silentControl = null;
        this.currentUrl = '';
        this.beforeEachHooks = [];
        this.afterEachHooks = [];
        this.transitionOutHooks = [];
        this.currentMatched = new Observable([]);
        this.currentRouteData = new Observable({
            params: {},
            query: {},
            name: '',
            fullPath: ''
        });
        this.currentRouteFromData = new Observable(null);
        if (!settings.mode) {
            this.settings.mode = 'hash';
            console.warn('[Easyroute] Router mode is not defined: fallback to "hash"');
        }
        this.routes = getMatchData(settings.routes);
        this.setParser();
        if (SSR && this.mode !== 'history')
            throw new Error('[Easyroute] SSR only works with "history" router mode');
    }
    setParser() {
        if (SSR)
            return;
        delay(0).then(() => {
            switch (this.mode) {
                case 'silent':
                    this.parseRoute(`${window.location.pathname}${window.location.search}`);
                    break;
                case 'history':
                    setHistoryMode.apply(this);
                    break;
                case 'hash':
                default:
                    setHashMode.apply(this);
                    break;
            }
        });
    }
    getTo(matched) {
        return matched.find((route) => route.nestingDepth === getMaxDepth(matched));
    }
    getFrom() {
        var _a;
        const current = this.currentMatched.getValue;
        if (!current)
            return null;
        return ((_a = current.find((route) => route.nestingDepth === getMaxDepth(current))) !== null && _a !== void 0 ? _a : null);
    }
    changeUrl(url, doPushState = true) {
        this.currentUrl = url;
        if (this.mode === 'hash') {
            window.location.hash = url;
        }
        if (this.mode === 'history' && doPushState && !SSR) {
            window.history.pushState({
                url
            }, url, url);
        }
    }
    async parseRoute(url, doPushState = true) {
        url = url.replace(/^#/, '');
        const matched = parseRoutes(this.routes, url.split('?')[0]);
        if (!matched)
            return;
        const to = this.getTo(matched);
        const from = this.getFrom();
        const toRouteInfo = UrlParser.createRouteObject([to], url);
        const fromRouteInfo = from
            ? UrlParser.createRouteObject([from], this.currentUrl)
            : null;
        if (this.mode === 'silent' && !this.silentControl) {
            this.silentControl = new SilentModeService(toRouteInfo);
        }
        if (this.silentControl && doPushState) {
            this.silentControl.appendHistory(toRouteInfo);
        }
        const allowNextGlobal = await this.runHooksArray(this.beforeEachHooks, toRouteInfo, fromRouteInfo, 'before');
        const allowNextLocal = await this.runHooksArray(matched.reduce((t, c) => {
            c.beforeEnter && t.push(c.beforeEnter);
            return t;
        }, []), toRouteInfo, fromRouteInfo, 'before');
        const allowNext = allowNextGlobal && allowNextLocal;
        if (!allowNext)
            return;
        this.changeUrl(constructUrl(url, this.base, this.settings.omitTrailingSlash), doPushState);
        this.currentRouteData.setValue(toRouteInfo);
        this.currentRouteFromData.setValue(fromRouteInfo);
        this.currentMatched.setValue(await downloadDynamicComponents(matched));
        this.runHooksArray(this.afterEachHooks, toRouteInfo, fromRouteInfo, 'after');
    }
    async executeHook(to, from, hook, type) {
        if (type === 'after')
            return hook(to, from);
        return new Promise(async (resolve) => {
            const next = (command) => {
                if (command !== null && command !== undefined) {
                    if (command === false)
                        resolve(false);
                    if (typeof command === 'string') {
                        this.parseRoute(command);
                        resolve(false);
                    }
                }
                else {
                    resolve(true);
                }
            };
            if (!hook)
                resolve(true);
            else
                await hook(to, from, next);
        });
    }
    async push(url) {
        this.ignoreEvents = true;
        await this.parseRoute(url);
    }
    go(howFar) {
        if (this.mode !== 'silent') {
            window.history.go(howFar);
        }
        else {
            this.parseRoute(this.silentControl.go(howFar), false);
        }
    }
    back() {
        this.go(-1);
    }
    beforeEach(hook) {
        this.beforeEachHooks.push(hook);
    }
    afterEach(hook) {
        this.afterEachHooks.push(hook);
    }
    transitionOut(hook) {
        this.transitionOutHooks.push(hook);
    }
    async runHooksArray(hooks, to, from, type) {
        for await (const hook of hooks) {
            const allow = await this.executeHook(to, from, hook, type);
            if (!allow)
                return false;
        }
        return true;
    }
    get mode() {
        return this.settings.mode;
    }
    get base() {
        if (!this.settings.base)
            return '';
        return deleteEdgeSlashes(this.settings.base) + '/';
    }
    get currentRoute() {
        return this.currentRouteData.getValue;
    }
}

export default Router;
