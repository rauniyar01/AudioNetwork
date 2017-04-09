// Copyright (c) 2015-2017 Robert Rypuła - https://audio-network.rypula.pl
'use strict';

var
    CANVAS_HEIGHT = 201,
    RECORD_TIME = 2,    // seconds
    PLAY_TIME = 10,      // seconds
    domCanvasContainer,
    domAudioMonoIoInitDiv,
    domRecordButton,
    domPlayButton,
    domLoopbackCheckbox,
    domSamplePerBit,
    domSequenceDuration,
    domRawSamples,
    bufferSize,
    audioMonoIO,
    recordInProgress = false,
    playInProgress = false,
    recordNeverStarted = true,
    bufferRecorded,
    bufferRecordedLimit,
    timeDomainBlock = [];

/*
TODO:
    - add test signal via buffer: Chirp, ASK, FSK, BPSK
    - improovements in AudioMonoIO
 */

function init() {
    domCanvasContainer = document.getElementById('canvas-container');
    domAudioMonoIoInitDiv = document.getElementById('audio-mono-io-init-div');
    domRecordButton = document.getElementById('record-button');
    domPlayButton = document.getElementById('play-button');
    domLoopbackCheckbox = document.getElementById('loopback-checkbox');
    domSamplePerBit = document.getElementById('sample-per-bit');
    domSequenceDuration = document.getElementById('sequence-duration');
    domRawSamples = document.getElementById('raw-samples');
}

function onLoopbackCheckboxChange() {
    if (audioMonoIO) {
        audioMonoIO.setLoopback(domLoopbackCheckbox.checked);
    }
}

function onAudioMonoIoInitClick(bufferSizeValue) {
    var bufferDuration;

    bufferSize = bufferSizeValue;
    audioMonoIO = new AudioMonoIO(AudioMonoIO.FFT_SIZE, bufferSize);
    audioMonoIO.setSampleInHandler(sampleInHandler);

    onLoopbackCheckboxChange();

    bufferDuration = bufferSize / audioMonoIO.getSampleRate();
    bufferRecordedLimit = Math.ceil(RECORD_TIME / bufferDuration);

    domAudioMonoIoInitDiv.parentNode.removeChild(domAudioMonoIoInitDiv);
    domRecordButton.innerHTML = 'Start';
    domPlayButton.innerHTML = 'Start';
}

function onRecordClick() {
    if (recordInProgress || !audioMonoIO) {
        return;
    }

    domRecordButton.innerHTML = 'Recording...';
    recordNeverStarted = false;
    recordInProgress = true;
    bufferRecorded = 0;
    timeDomainBlock.length = 0;
    domCanvasContainer.innerHTML = '';
    domCanvasContainer.style.width = '0';
}

function onPlayClick() {
    var
        testSoundBuffer,
        buffer,
        bufferChannelData,
        bufferSourceNode,
        html,
        i;

    if (playInProgress || !audioMonoIO) {
        return;
    }

    testSoundBuffer = getTestSoundBuffer();

    domSequenceDuration.innerHTML =
        (testSoundBuffer.length / audioMonoIO.getSampleRate()).toFixed(3) + ' sec';

    buffer = audioMonoIO
        .$$audioContext
        .createBuffer(
            1,
            testSoundBuffer.length,
            audioMonoIO.getSampleRate()
        );
    bufferChannelData = buffer.getChannelData(0);
    for (i = 0; i < testSoundBuffer.length; i++) {
        bufferChannelData[i] = testSoundBuffer[i];
    }
    bufferSourceNode = audioMonoIO
        .$$audioContext
        .createBufferSource();
    bufferSourceNode.buffer = buffer;

    bufferSourceNode.connect(audioMonoIO.$$masterOut);
    bufferSourceNode.loop = true;
    bufferSourceNode.start();

    domPlayButton.innerHTML = 'Playing in a loop...';
    playInProgress = true;

    html = '';
    for (i = 0; i < testSoundBuffer.length; i++) {
        html += testSoundBuffer[i].toFixed(6) + '\n';
    }
    domRawSamples.value = html;
}

// -----------------------------------------------------------------------
// utils

function generateSineWave(samplePerPeriod, amplitude, unitPhaseOffset, sample) {
    var x;

    x = 2 * Math.PI * (sample / samplePerPeriod - unitPhaseOffset);

    return amplitude * Math.sin(x);
}

function getSamplePerPeriod(frequency) {
    return audioMonoIO.getSampleRate() / frequency;
}

function pad(num, size) {
    var s = '000000' + num;

    return s.substr(s.length - size);
}

// -----------------------------------------------------------------------
// test sound

function appendBitASK(buffer, isOne) {
    var samplePerBit, i, sample;

    samplePerBit = parseInt(domSamplePerBit.value);
    for (i = 0; i < samplePerBit; i++) {
        sample = generateSineWave(32, isOne ? 1.0 : 0.3, 0, buffer.length);
        buffer.push(sample);
    }
}

function appendBitBPSK(buffer, isOne) {
    var samplePerBit, i, sample;

    samplePerBit = parseInt(domSamplePerBit.value);
    for (i = 0; i < samplePerBit; i++) {
        sample = generateSineWave(32, 1, isOne ? 0.5 : 0.0, buffer.length);
        buffer.push(sample);
    }
}

function appendBitFSK(buffer, isOne) {
    var samplePerBit, i, sample;

    samplePerBit = parseInt(domSamplePerBit.value);
    for (i = 0; i < samplePerBit; i++) {
        sample = generateSineWave(isOne ? 16 : 32, 1, 0, buffer.length);
        buffer.push(sample);
    }
}

function appendBitHighLow(buffer, isOne) {
    var samplePerBit, i, sample;

    samplePerBit = parseInt(domSamplePerBit.value);
    for (i = 0; i < samplePerBit; i++) {
        sample = isOne ? 0.8 : -0.8;
        buffer.push(sample);
    }
}

function appendBitChirp(buffer, isOne) {
    var samplePerBit, i, sample, phaseAcceleration, carrierPhase, t, carrierFullCycles;

    samplePerBit = parseInt(domSamplePerBit.value);
    carrierPhase = 0;

    carrierFullCycles = samplePerBit / 32;
    phaseAcceleration = carrierFullCycles * (isOne ? -1 : 1);   // this will double the full cycles in bit period
    for (i = 0; i < samplePerBit; i++) {
        t = i / samplePerBit;
        carrierPhase = phaseAcceleration * t * t / 2;
        sample = generateSineWave(isOne ? 32 : 16, 1, carrierPhase, buffer.length);

        buffer.push(sample);
    }
}

function appendWhiteNoise(buffer, amount) {
    var i, samplePerBit;

    samplePerBit = parseInt(domSamplePerBit.value);
    for (i = 0; i < amount * samplePerBit; i++) {
        buffer.push(
            -1 + Math.random() * 2
        );
    }
}

function appendSilence(buffer, amount) {
    var i, samplePerBit;

    samplePerBit = parseInt(domSamplePerBit.value);
    for (i = 0; i < amount * samplePerBit; i++) {
        buffer.push(0);
    }
}

function getTestSoundBuffer() {
    var i, j, k, output, isOne, binaryStr, samplePerBit, modulation;

    output = [];
    samplePerBit = parseInt(domSamplePerBit.value);
    modulation = 0;
    while (true) {

        for (i = 0; i < 8; i++) {
            binaryStr = i.toString(2);
            binaryStr = pad(binaryStr, 3);

            for (j = 0; j < binaryStr.length; j++) {
                isOne = (binaryStr[j] === '1');

                switch (modulation) {
                    case 0:   // ASK
                        appendBitASK(output, isOne);
                        break;
                    case 1:   // BPSK
                        appendBitBPSK(output, isOne);
                        break;
                    case 2:   // FSK
                        appendBitFSK(output, isOne);
                        break;
                    case 3:   // High/Low state
                        appendBitHighLow(output, isOne);
                        break;
                    case 4:   // chirp
                        appendBitChirp(output, isOne);
                        break;
                }
            }

            for (k = 0; k < samplePerBit; k++) {
                output.push(0);
            }
        }

        modulation++;

        appendWhiteNoise(output, 2);
        appendSilence(output, 1);

        if (modulation === 5) {
            break;
        }
    }

    appendWhiteNoise(output, 16);
    appendSilence(output, 1);

    return output;
}

// -----------------------------------------------------------------------
// animation, canvas 2d context

function clear(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawLine(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.closePath();
    ctx.stroke();
}

function getConfiguredCanvasContext(elementId, width, height) {
    var element, ctx;

    element = document.getElementById(elementId);
    element.width = width;
    element.height = height;
    ctx = element.getContext('2d');
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.font = "12px Arial";

    return ctx;
}

function drawTimeDomainData(ctx, data, offset, sampleRate) {
    var limit, hMid, x, y1, y2, duration;

    clear(ctx);

    hMid = Math.floor(0.5 * CANVAS_HEIGHT);
    limit = data.length;
    for (x = 0; x < limit - 1; x++) {
        y1 = hMid * (1 - data[x]);
        y2 = hMid * (1 - data[x + 1]);
        drawLine(ctx, x, y1, x + 1, y2);
    }

    duration = data.length / sampleRate;
    for (x = 0; x < data.length; x += 128) {
        drawLine(ctx, x, 0, x, 12);
        ctx.fillText(
            ((duration * offset + x / sampleRate) * 1000).toFixed(1) + ' ms',
            x + 4,
            10
        );
        drawLine(ctx, x, CANVAS_HEIGHT, x, CANVAS_HEIGHT - 12);
        ctx.fillText(
            (offset * data.length + x).toFixed(0),
            x + 4,
            CANVAS_HEIGHT - 2
        );
    }

    drawLine(ctx, 0, 0, 0, 2 * hMid);
    ctx.fillText(
        'Buffer #' + offset,
        4,
        25
    );
}

// -----------------------------------------------------------------------
// data handlers

function sampleInHandler(monoIn) {
    if (recordNeverStarted) {
        return;
    }

    if (bufferRecorded >= bufferRecordedLimit) {
        recordInProgress = false;
        domRecordButton.innerHTML = 'Start again';
        return;
    }

    timeDomainBlock.push(monoIn);
    bufferRecorded++;

    if (bufferRecorded === bufferRecordedLimit) {
        showRecording();
    }
}

function showRecording() {
    var i, ctx, canvasHtml;

    canvasHtml = '';
    for (i = 0; i < timeDomainBlock.length; i++) {
        canvasHtml += '<canvas id="canvas-block-' + i + '"></canvas>';
    }
    domCanvasContainer.innerHTML = canvasHtml;
    domCanvasContainer.style.width = timeDomainBlock.length * bufferSize + timeDomainBlock.length + 'px';
    for (i = 0; i < timeDomainBlock.length; i++) {
        ctx = getConfiguredCanvasContext(
            'canvas-block-' + i,
            bufferSize,
            CANVAS_HEIGHT
        );
        drawTimeDomainData(ctx, timeDomainBlock[i], i, audioMonoIO.getSampleRate());
    }
}
