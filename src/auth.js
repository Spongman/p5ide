"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var Auth = (function () {
    function Auth() {
        this.authenticated = false;
    }
    Auth.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var token;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        token = window.localStorage.access_token;
                        if (!token) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.authenticate(token)];
                    case 1:
                        if (!(_a.sent()))
                            window.localStorage.access_token = null;
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    Auth.prototype.login = function () {
        return __awaiter(this, void 0, void 0, function () {
            var token, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.authenticated)
                            return [2 /*return*/];
                        _a = window.localStorage;
                        return [4 /*yield*/, this.fetchToken()];
                    case 1:
                        token = _a.access_token = _b.sent();
                        if (!token) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.authenticate(token)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Auth.prototype.authenticate = function (token) {
        return __awaiter(this, void 0, void 0, function () {
            var userResponse, userJson;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch("https://api.github.com/user", {
                            method: "GET",
                            headers: {
                                Authorization: "token " + token
                            },
                            cache: "no-cache"
                        })];
                    case 1:
                        userResponse = _a.sent();
                        return [4 /*yield*/, userResponse.json()];
                    case 2:
                        userJson = _a.sent();
                        this.userName = userJson.login;
                        this.authenticated = !!this.userName;
                        document.body.classList.toggle("authenticated", this.authenticated);
                        document.getElementById("userName").textContent = this.userName || "";
                        return [2 /*return*/, this.authenticated];
                }
            });
        });
    };
    Auth.prototype.logoff = function () {
        delete window.localStorage.access_token;
        delete this.userName;
        this.authenticated = false;
        document.body.classList.remove("authenticated");
    };
    Auth.prototype.fetchToken = function () {
        return new Promise(function (resolve, reject) {
            var params = {
                width: 450,
                height: 600,
                menubar: 0,
                toolbar: 0,
                personalbar: 0,
                status: 0,
                left: window.screenLeft + window.innerWidth - 450,
                top: window.screenTop + window.innerHeight - 600
            };
            var loginWindow = window.open("https://github.com/login/oauth/authorize?scope=public_repo&client_id=2cb7dbbede12e09b2112", "_login", Object.keys(params).map(function (k) { return k + '=' + params[k]; }).join(','));
            window.addEventListener("message", onMessage);
            var interval = setInterval(function () {
                if (!loginWindow || loginWindow.closed) {
                    close();
                    reject("cancelled");
                }
            }, 250);
            function close() {
                clearInterval(interval);
                window.removeEventListener("message", onMessage);
                loginWindow.close();
            }
            function onMessage(event) {
                return __awaiter(this, void 0, void 0, function () {
                    var data, code, loginResponse, loginJson, access_token;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                data = event.data;
                                code = data && data.code;
                                if (!code) return [3 /*break*/, 3];
                                return [4 /*yield*/, fetch("https://p5ide.codewithoutborders.com/login?code=" + code, {
                                        cache: "no-cache"
                                    })];
                            case 1:
                                loginResponse = _a.sent();
                                return [4 /*yield*/, loginResponse.text()];
                            case 2:
                                loginJson = _a.sent();
                                access_token = new URLSearchParams(loginJson).get("access_token");
                                close();
                                if (access_token)
                                    resolve(access_token);
                                else
                                    reject("failed");
                                _a.label = 3;
                            case 3: return [2 /*return*/];
                        }
                    });
                });
            }
        });
    };
    return Auth;
}());
exports.Auth = Auth;
