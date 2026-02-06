import {
    FaceLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const video = document.getElementById("webcam");

// Global State
window.isLooking = false;
window.isModelLoaded = false;
window.isVisionReady = false;

let faceLandmarker = undefined;
let lastVideoTime = -1;

async function createFaceLandmarker() {
    try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });
        window.isModelLoaded = true;
        console.log("VISION: Model Loaded");
    } catch (e) {
        console.error("VISION: Model Load Error", e);
    }
}

window.startVision = function () {
    if (!faceLandmarker) {
        console.log("VISION: Creating Model...");
        createFaceLandmarker().then(() => {
            enableCam();
        });
    } else {
        enableCam();
    }
};

function enableCam() {
    if (!faceLandmarker) return;
    const constraints = { video: true };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", () => {
            console.log("VISION: Camera Ready for Polling");
        });
    });
}

// EXPOSED MANUAL POLL FUNCTION (Called by Sketch.js)
window.manualPredict = async function () {
    if (!faceLandmarker || !video || video.readyState < 2) return;

    if (video.videoWidth > 0 && video.videoHeight > 0) {
        let startTimeMs = performance.now();
        if (lastVideoTime !== video.currentTime) {
            lastVideoTime = video.currentTime;
            const results = faceLandmarker.detectForVideo(video, startTimeMs);

            if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                window.isLooking = true;
            } else {
                window.isLooking = false;
            }
        }
        window.isVisionReady = true;
    }
};

// Start Loading Immediately
createFaceLandmarker();
