from ultralytics import YOLO
import cv2


vehicle_model = YOLO('yolov8n.pt')           # General object detection (vehicles)
helmet_model  = YOLO('helmet-detection.pt')  # Custom helmet detector


cap = cv2.VideoCapture('traffic.mp4')
CLASS_NAMES = vehicle_model.model.names

signal_line_y = 300      # Red line for signal jump detection
violation_count = 0
frame_num = 0


while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_num += 1
    annotated = frame.copy()

    # Run YOLO detections
    vehicle_results = vehicle_model(frame)
    helmet_results  = helmet_model(frame)

    vehicle_count = 0
    helmet_count = 0

  
    for r in vehicle_results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            label  = CLASS_NAMES[cls_id]
            conf   = float(box.conf[0])

            if label in ['car', 'bus', 'truck', 'motorbike']:
                vehicle_count += 1
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2

                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(annotated, f"{label} {conf:.2f}", (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

                if cy < signal_line_y - 5:
                    violation_count += 1
                    cv2.putText(annotated, "Signal Jump!", (x1, y1 - 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)


    for r in helmet_results:
        for box in r.boxes:
            helmet_count += 1
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 0, 255), 2)
            cv2.putText(annotated, "Helmet", (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

 
    cv2.line(annotated, (0, signal_line_y),
             (annotated.shape[1], signal_line_y), (0, 0, 255), 2)

    cv2.putText(annotated, f"Vehicles: {vehicle_count}", (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
    cv2.putText(annotated, f"Helmets: {helmet_count}", (20, 70),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
    cv2.putText(annotated, f"Violations: {violation_count}", (20, 100),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
    cv2.putText(annotated, f"Frame: {frame_num}", (20, 130),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

    cv2.imshow("Smart CCTV AI System", annotated)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Cleanup

cap.release()
cv2.destroyAllWindows()
print(f"\n✅ Finished processing. Total Violations: {violation_count}")
