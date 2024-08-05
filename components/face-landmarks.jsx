"use client";
import React, { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { debounce } from "lodash";
import {
  DrawingUtils,
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

export default function FaceLandmarks() {
  const [faceData, setFaceData] = useState([]);
  const [alertMessage, setAlertMessage] = useState("");
  const [isFaceCentered, setIsFaceCentered] = useState(false);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const drawingUtilsRef = useRef(null);

  const faceRegion = { x: 450, y: 100, width: 400, height: 520 };
  const borderRadius = 20;
  let previousAlertMessage = "";

  const debouncedSetAlertMessage = debounce((message) => {
    setAlertMessage(message);
  }, 500);

  useEffect(() => {
    const createFaceLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `./models/face_landmarker.task`,
            delegate: "GPU",
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1,
        });
        landmarkerRef.current = faceLandmarker;
        startCapture();
      } catch (error) {
        console.error("Error creating face landmarker:", error);
      }
    };
    createFaceLandmarker();
  }, []);

  const startCapture = () => {
    const captureInterval = setInterval(async () => {
      if (
        webcamRef.current &&
        landmarkerRef.current &&
        webcamRef.current.video
      ) {
        const video = webcamRef.current.video;
        if (video.currentTime > 0) {
          try {
            const result = await landmarkerRef.current.detectForVideo(
              video,
              performance.now()
            );

            if (result.faceLandmarks) {
              setFaceData(result.faceLandmarks);

              if (result.faceBlendshapes) {
                const blendShape = result.faceBlendshapes[0]?.categories || [];
                let eyeCentered = true;
                let message = "";

                const threshold = 0.5;
                for (const shape of blendShape) {
                  switch (shape.categoryName) {
                    case "eyeLookInLeft":
                    case "eyeLookInRight":
                      if (shape.score > threshold) {
                        message =
                          "لطفاً به سمت دوربین نگاه کنید - صورت خود را به سمت چپ یا راست بچرخانید.";
                        eyeCentered = false;
                        setIsFaceCentered(false);
                      }
                      break;
                    case "eyeLookOutLeft":
                    case "eyeLookOutRight":
                      if (shape.score > threshold) {
                        message =
                          "لطفاً به سمت دوربین نگاه کنید - صورت خود را به سمت چپ یا راست بیاورید.";
                        eyeCentered = false;
                        setIsFaceCentered(false);
                      }
                      break;
                    case "eyeLookUpLeft":
                    case "eyeLookUpRight":
                      if (shape.score > threshold) {
                        message =
                          "لطفاً به سمت دوربین نگاه کنید - صورت خود را به سمت بالا ببرید.";
                        eyeCentered = false;
                        setIsFaceCentered(false);
                      }
                      break;
                    case "eyeLookDownLeft":
                    case "eyeLookDownRight":
                      if (shape.score > threshold) {
                        message =
                          "لطفاً به سمت دوربین نگاه کنید - صورت خود را به سمت پایین بیاورید.";
                        eyeCentered = false;
                        setIsFaceCentered(false);
                      }
                      break;
                    default:
                      break;
                  }
                }

                const mouthSmileRight = blendShape.find(
                  (shape) => shape.categoryName === "mouthSmileRight"
                );
                if (mouthSmileRight && mouthSmileRight.score > threshold) {
                  message = "شما در حال لبخند زدن هستید.";
                }

                if (eyeCentered) {
                  message = "در مرکز قرار دارید.";
                }

                if (message !== previousAlertMessage) {
                  debouncedSetAlertMessage(message);
                  previousAlertMessage = message;
                }

                setIsFaceCentered(eyeCentered);
              } else {
                debouncedSetAlertMessage("پیدا کردن نقاط صورت ممکن نبود.");
                setIsFaceCentered(false);
              }
            } else {
              debouncedSetAlertMessage("پیدا کردن نقاط صورت ممکن نبود.");
              setIsFaceCentered(false);
            }
          } catch (error) {
            console.error("Error detecting face landmarks:", error);
          }
        }
      }
    }, 100);

    return () => clearInterval(captureInterval);
  };

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    drawingUtilsRef.current = new DrawingUtils(ctx);
  }, []);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    if (drawingUtilsRef.current) {
      ctx.clearRect(0, 0, 1280, 720);
      ctx.strokeStyle = "#1677FF";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(faceRegion.x + borderRadius, faceRegion.y);
      ctx.lineTo(faceRegion.x + faceRegion.width - borderRadius, faceRegion.y);
      ctx.arc(
        faceRegion.x + faceRegion.width - borderRadius,
        faceRegion.y + borderRadius,
        borderRadius,
        1.5 * Math.PI,
        2 * Math.PI
      );
      ctx.lineTo(
        faceRegion.x + faceRegion.width,
        faceRegion.y + faceRegion.height - borderRadius
      );
      ctx.arc(
        faceRegion.x + faceRegion.width - borderRadius,
        faceRegion.y + faceRegion.height - borderRadius,
        borderRadius,
        0,
        0.5 * Math.PI
      );
      ctx.lineTo(faceRegion.x + borderRadius, faceRegion.y + faceRegion.height);
      ctx.arc(
        faceRegion.x + borderRadius,
        faceRegion.y + faceRegion.height - borderRadius,
        borderRadius,
        0.5 * Math.PI,
        Math.PI
      );
      ctx.lineTo(faceRegion.x, faceRegion.y + borderRadius);
      ctx.arc(
        faceRegion.x + borderRadius,
        faceRegion.y + borderRadius,
        borderRadius,
        Math.PI,
        1.5 * Math.PI
      );
      ctx.closePath();
      ctx.stroke();

      if (faceData.length > 0) {
        for (const face of faceData) {
          const connectorColor = isFaceCentered ? "#1867ef5d" : "#C0C0C070";
          drawingUtilsRef.current.drawConnectors(
            face,
            FaceLandmarker.FACE_LANDMARKS_TESSELATION,
            { color: connectorColor, lineWidth: 1 }
          );
          drawingUtilsRef.current.drawConnectors(
            face,
            FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
            { color: connectorColor, lineWidth: 3 }
          );
          drawingUtilsRef.current.drawConnectors(
            face,
            FaceLandmarker.FACE_LANDMARKS_LIPS,
            { color: connectorColor, lineWidth: 2 }
          );
        }
      }

      const faceX = faceData[0]?.[0]?.x * canvasRef.current.width; // Adjust this calculation as needed
      const faceY = faceData[0]?.[0]?.y * canvasRef.current.height; // Adjust this calculation as needed
      const faceWidth = 100; // Assume a face width, adjust if necessary
      const faceHeight = 100; // Assume a face height, adjust if necessary

      const faceInRegion =
        faceX >= faceRegion.x &&
        faceY >= faceRegion.y &&
        faceX + faceWidth <= faceRegion.x + faceRegion.width &&
        faceY + faceHeight <= faceRegion.y + faceRegion.height;

      if (faceInRegion) {
        setIsFaceCentered(true);
      } else {
        setIsFaceCentered(false);
        debouncedSetAlertMessage(
          "لطفاً صورت خود را در ناحیه مشخص شده قرار دهید."
        );
      }
    }
  }, [faceData, isFaceCentered]);

  return (
    <section className="container mx-auto mt-10 rounded-lg">
      <div className="relative w-full pt-[56.25%] rounded-lg">
        <Webcam
          width="1280"
          height="720"
          mirrored
          id="webcam"
          audio={false}
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "user",
          }}
          ref={webcamRef}
          className="absolute top-0 left-0 w-full h-full rounded-3xl shadow-2xl"
        />
        <canvas
          ref={canvasRef}
          width="1280"
          height="720"
          style={{ transform: "rotateY(180deg)" }}
          className="absolute top-0 left-0 w-full h-full"
        ></canvas>
        <div
          className={`absolute bottom-0 left-0 w-full p-4 text-center rounded-b-3xl text-white font-bold border-blue-500 bg-opacity-50`}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          {alertMessage}
        </div>
        <div
          className={`absolute top-0 left-0 w-full h-full border-4 rounded-3xl border-blue-500 border-opacity-50`}
        />
      </div>
    </section>
  );
}
