// Copyright (c) 2015-2016 Robert Rypuła - https://audio-network.rypula.pl
(function () {
    'use strict';

    AudioNetwork.Injector
        .registerFactory('PhysicalLayer.RxStateMachine', _RxStateMachine);

    _RxStateMachine.$inject = [
        'PhysicalLayer.ReceiveAdapterState'
    ];

    function _RxStateMachine(
        ReceiveAdapterState
    ) {
        var RSM;

        RSM = function (handlerIdleInit, handlerFirstSyncWait, handlerFirstSync, handlerFatalError, handlerIdle, handlerSymbol, handlerSync, handlerGuard, handlerError) {
            this.$$stateHandler = {};
            this.$$stateHandler[ReceiveAdapterState.IDLE_INIT] = handlerIdleInit;
            this.$$stateHandler[ReceiveAdapterState.FIRST_SYNC_WAIT] = handlerFirstSyncWait;
            this.$$stateHandler[ReceiveAdapterState.FIRST_SYNC] = handlerFirstSync;
            this.$$stateHandler[ReceiveAdapterState.FATAL_ERROR] = handlerFatalError;
            this.$$stateHandler[ReceiveAdapterState.IDLE] = handlerIdle;
            this.$$stateHandler[ReceiveAdapterState.SYMBOL] = handlerSymbol;
            this.$$stateHandler[ReceiveAdapterState.SYNC] = handlerSync;
            this.$$stateHandler[ReceiveAdapterState.GUARD] = handlerGuard;
            this.$$stateHandler[ReceiveAdapterState.ERROR] = handlerError;
            this.$$symbolStateMaxDurationTime = null;
            this.$$guardStateMaxDurationTime = null;
            this.$$syncStateMaxDurationTime = null;

            this.$$state = null;
            this.$$stateDurationTime = null;
            this.$$stateBeginTime = null;
            this.$$resetFlag = true;
        };

        RSM.SET_ALL_MAX_DURATION_TIMES_FIRST_EXCEPTION = 'Please set all max duration times first';

        RSM.prototype.scheduleReset = function () {
            this.$$resetFlag = true;
        };

        RSM.prototype.$$changeState = function (newState, time) {
            if (newState !== null) {
                this.$$state = newState;
                this.$$stateBeginTime = time;
            } else {
                this.$$stateDurationTime = time - this.$$stateBeginTime;
            }
        };

        RSM.prototype.$$handlerIdleInit = function (pilotSignalPresent, time) {
            var newState;

            this.$$changeState(null, time);

            // run external handler
            newState = this.$$stateHandler[ReceiveAdapterState.IDLE_INIT](this.$$stateDurationTime);

            if (newState) {
                this.$$changeState(newState, time);
                return false;
            }

            return true;
        };

        RSM.prototype.$$handlerFirstSyncWait = function (pilotSignalPresent, time) {
            if (pilotSignalPresent) {
                this.$$changeState(ReceiveAdapterState.FIRST_SYNC, time);
                return false;
            } else {
                this.$$changeState(null, time);

                // run external handler
                this.$$stateHandler[ReceiveAdapterState.FIRST_SYNC_WAIT](this.$$stateDurationTime);
            }

            return true;
        };

        RSM.prototype.$$handlerFirstSync = function (pilotSignalPresent, time) {
            var newState;

            this.$$changeState(null, time);

            // run external handler
            newState = this.$$stateHandler[ReceiveAdapterState.FIRST_SYNC](this.$$stateDurationTime);

            if (newState) {
                this.$$changeState(newState, time);
                return false;
            }

            return true;
        };

        RSM.prototype.$$handlerFatalError = function (pilotSignalPresent, time) {
            var newState;

            this.$$changeState(null, time);

            // run external handler
            newState = this.$$stateHandler[ReceiveAdapterState.FATAL_ERROR](this.$$stateDurationTime);

            if (newState) {
                this.$$changeState(newState, time);
                return false;
            }

            return true;
        };

        RSM.prototype.$$handlerIdle = function (pilotSignalPresent, time) {
            if (pilotSignalPresent) {
                this.$$changeState(ReceiveAdapterState.SYMBOL, time);
                return false;
            } else {
                this.$$changeState(null, time);

                // run external handler
                this.$$stateHandler[ReceiveAdapterState.IDLE](this.$$stateDurationTime);
            }

            return true;
        };

        RSM.prototype.$$handlerSymbol = function (pilotSignalPresent, time) {
            if (!pilotSignalPresent) {
                this.$$changeState(ReceiveAdapterState.GUARD, time);
                return false;
            } else {
                this.$$changeState(null, time);

                // run external handler
                this.$$stateHandler[ReceiveAdapterState.SYMBOL](this.$$stateDurationTime);

                if (this.$$stateDurationTime > this.$$symbolStateMaxDurationTime) {
                    this.$$changeState(ReceiveAdapterState.SYNC, time);
                    return false;
                }
            }

            return true;
        };

        RSM.prototype.$$handlerSync = function (pilotSignalPresent, time) {
            if (!pilotSignalPresent) {
                this.$$changeState(ReceiveAdapterState.IDLE, time);
                return false;
            } else {
                this.$$changeState(null, time);

                // run external handler
                this.$$stateHandler[ReceiveAdapterState.SYNC](this.$$stateDurationTime);

                if (this.$$stateDurationTime > this.$$syncStateMaxDurationTime) {
                    this.$$changeState(ReceiveAdapterState.ERROR, time);
                    return false;
                }
            }

            return true;
        };

        RSM.prototype.$$handlerGuard = function (pilotSignalPresent, time) {
            if (pilotSignalPresent) {
                this.$$changeState(ReceiveAdapterState.SYMBOL, time);
                return false;
            } else {
                this.$$changeState(null, time);

                // run external handler
                this.$$stateHandler[ReceiveAdapterState.GUARD](this.$$stateDurationTime);
                
                if (this.$$stateDurationTime > this.$$guardStateMaxDurationTime) {
                    this.$$changeState(ReceiveAdapterState.IDLE, time);
                    return false;
                }
            }

            return true;
        };

        RSM.prototype.$$handlerError = function (pilotSignalPresent, time) {
            if (!pilotSignalPresent) {
                this.$$changeState(ReceiveAdapterState.IDLE, time);
                return false;
            } else {
                this.$$changeState(null, time);

                // run external handler
                this.$$stateHandler[ReceiveAdapterState.ERROR](this.$$stateDurationTime);
            }

            return true;
        };

        RSM.prototype.setGuardStateMaxDurationTime = function (time) {
            this.$$guardStateMaxDurationTime = time;
        };

        RSM.prototype.setSymbolStateMaxDurationTime = function (time) {
            this.$$symbolStateMaxDurationTime = time;
        };

        RSM.prototype.setSyncStateMaxDurationTime = function (time) {
            this.$$syncStateMaxDurationTime = time;
        };

        RSM.prototype.getState = function (pilotSignalPresent, time) {
            var
                S = ReceiveAdapterState,
                finished
            ;

            if (this.$$resetFlag) {
                this.$$changeState(S.IDLE_INIT, time);
                this.$$resetFlag = false;
            }

            if (
                this.$$guardStateMaxDurationTime === null ||
                this.$$symbolStateMaxDurationTime === null ||
                this.$$syncStateMaxDurationTime === null
            ) {
                throw RSM.SET_ALL_MAX_DURATION_TIMES_FIRST_EXCEPTION;
            }

            while (true) {
                switch (this.$$state) {
                    case S.IDLE_INIT:
                        finished = this.$$handlerIdleInit(pilotSignalPresent, time);
                        break;
                    case S.FIRST_SYNC_WAIT:
                        finished = this.$$handlerFirstSyncWait(pilotSignalPresent, time);
                        break;
                    case S.FIRST_SYNC:
                        finished = this.$$handlerFirstSync(pilotSignalPresent, time);
                        break;
                    case S.FATAL_ERROR:
                        finished = this.$$handlerFatalError(pilotSignalPresent, time);
                        break;
                    case S.IDLE:
                        finished = this.$$handlerIdle(pilotSignalPresent, time);
                        break;
                    case S.SYMBOL:
                        finished = this.$$handlerSymbol(pilotSignalPresent, time);
                        break;
                    case S.SYNC:
                        finished = this.$$handlerSync(pilotSignalPresent, time);
                        break;
                    case S.GUARD:
                        finished = this.$$handlerGuard(pilotSignalPresent, time);
                        break;
                    case S.ERROR:
                        finished = this.$$handlerError(pilotSignalPresent, time);
                        break;
                }

                if (finished) {
                    break;
                }
            }
            return this.$$state;
        };

        return RSM;
    }

})();
