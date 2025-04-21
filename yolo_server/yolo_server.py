import os
import io
import base64
import numpy as np
import cv2
import json
import requests
import time
import torch
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from flask import Flask, request, jsonify
from flask_cors import CORS

# Ultralytics 라이브러리 사용
from ultralytics import YOLO

# 서버 설정
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 최대 16MB로 설정
CORS(app)

# 환경 변수 설정
WASTE_API_URL = "https://172.31.1.48:15000/api/pickup/waste/type-list"

# 학습된 커스텀 모델 경로 설정
CUSTOM_MODEL_PATH = "yolov8x_waste_final.pt"
# 백업용 기본 모델
DEFAULT_MODEL_NAME = "yolov8n.pt"

# 앙상블 감지를 위한 추가 모델 (선택적)
ENSEMBLE_MODEL_PATH = "yolov8n.pt"  # 기본 YOLOv8 모델을 앙상블에 사용

# 대구시 대형폐기물 가격 데이터
DAEGU_WASTE_PRICES = {
    "laptop": 2000,           # 컴퓨터, 노트북 모든규격 - 2,000원
    "tv_small": 3000,         # T.V 42인치미만 - 3,000원
    "tv_large": 6000,         # T.V 42인치이상 - 6,000원
    "refrigerator_small": 5000,  # 냉장고 300ℓ미만 - 5,000원
    "refrigerator_medium": 7000, # 냉장고 300ℓ이상 500ℓ미만 - 7,000원
    "refrigerator_large": 9000,  # 냉장고 500ℓ이상 700ℓ미만 - 9,000원
    "refrigerator_xlarge": 15000, # 냉장고 700ℓ이상 - 15,000원
    "microwave": 3000,        # 전자렌지 모든규격 - 3,000원
    "oven": 5000,             # 전기오븐렌지 높이 1m 이상 - 5,000원
    "cell_phone": 1000,       # 소형가전으로 분류 - 1,000원
    "keyboard": 1000,         # 소형가전으로 분류 - 1,000원
    "mouse": 1000,            # 소형가전으로 분류 - 1,000원
    "remote": 1000,           # 소형가전으로 분류 - 1,000원
    "toaster": 1000,          # 소형가전으로 분류 - 1,000원
    "hair_drier": 1000,       # 소형가전으로 분류 - 1,000원
    "clock": 1000,            # 소형가전으로 분류 - 1,000원
    "chair_small": 2000,      # 의자 소형 - 2,000원
    "chair_large": 4000,      # 의자 대형 - 4,000원
    "couch_single": 4000,     # 쇼파 1인용 - 4,000원
    "couch_double": 6000,     # 쇼파 2인용 (1인 추가시 2,000원) - 6,000원
    "bed_single": 6000,       # 침대 1인용 구조물 - 6,000원
    "bed_double": 8000,       # 침대 2인용 구조물 - 8,000원
    "dining_table_small": 4000, # 식탁 6인용 미만 - 4,000원
    "dining_table_large": 6000, # 식탁 6인용 이상 - 6,000원
    "toilet": 5000,           # 변기 좌변기 - 5,000원
    "sink": 5000,             # 세면대 - 5,000원
    "vase": 1000,             # 화분(소형) - 1,000원
    "scissors": 1000,         # 소형가전으로 분류 - 1,000원
    "book": 1000,             # 책 - 1,000원
    "potted_plant_small": 1000, # 화분 소형 - 1,000원
    "potted_plant_large": 2000, # 화분 대형 - 2,000원
    "toothbrush": 1000,       # 일반쓰레기 소형 - 1,000원
    "teddy_bear": 1000,       # 장난감 kg당 - 1,000원
    "speaker": 2000,          # 오디오 스피커 - 2,000원
    "desk": 6000,             # 책상 - 6,000원
    "cabinet": 3000,          # 협탁/서랍장 - 3,000원
    
    # 재활용품 기본가
    "default_recyclable": 1000,  # 재활용품 기본 가격
    
    # 일반쓰레기 기본가
    "default_general": 1000,     # 일반쓰레기 기본 가격
}

# 커스텀 모델 클래스와 API 카테고리 매핑
CUSTOM_MODEL_API_MAPPING = {
    # 가구류
    "가구류-밥상": {"api_category": "가구류", "api_type": "식탁", "daegu_key": "dining_table_small"},
    "가구류-의자": {"api_category": "가구류", "api_type": "의자", "daegu_key": "chair_small"},
    "가구류-책상": {"api_category": "가구류", "api_type": "책상", "daegu_key": "desk"},
    "가구류-침대": {"api_category": "가구류", "api_type": "침대", "daegu_key": "bed_single"},
    "가구류-협탁": {"api_category": "가구류", "api_type": "협탁", "daegu_key": "cabinet"},
    
    # 비닐류
    "비닐-과자봉지": {"api_category": "재활용품", "api_type": "비닐", "daegu_key": None},
    "비닐-기타": {"api_category": "재활용품", "api_type": "비닐", "daegu_key": None},
    "비닐-리필용기": {"api_category": "재활용품", "api_type": "비닐", "daegu_key": None},
    "비닐-봉투": {"api_category": "재활용품", "api_type": "비닐", "daegu_key": None},
    "비닐-에어캡": {"api_category": "재활용품", "api_type": "비닐", "daegu_key": None},
    "비닐-일회용덮개": {"api_category": "재활용품", "api_type": "비닐", "daegu_key": None},
    "비닐-포장제": {"api_category": "재활용품", "api_type": "비닐", "daegu_key": None},
    
    # 유리병
    "유리병-기타": {"api_category": "재활용품", "api_type": "유리", "daegu_key": None},
    "유리병-기타술병": {"api_category": "재활용품", "api_type": "유리", "daegu_key": None},
    "유리병-맥주병": {"api_category": "재활용품", "api_type": "유리", "daegu_key": None},
    "유리병-물병": {"api_category": "재활용품", "api_type": "유리", "daegu_key": None},
    "유리병-소주병": {"api_category": "재활용품", "api_type": "유리", "daegu_key": None},
    "유리병-음료수병": {"api_category": "재활용품", "api_type": "유리", "daegu_key": None},
    
    # 전자제품
    "전자제품-TV": {"api_category": "가전제품", "api_type": "T.V", "daegu_key": "tv_small"},
    "전자제품-기타": {"api_category": "가전제품", "api_type": "기타 소형가전", "daegu_key": None},
    "전자제품-오디오": {"api_category": "가전제품", "api_type": "기타 소형가전", "daegu_key": "speaker"},
    "전자제품-이동전화단말기": {"api_category": "가전제품", "api_type": "기타 소형가전", "daegu_key": "cell_phone"},
    "전자제품-컴퓨터": {"api_category": "가전제품", "api_type": "컴퓨터, 노트북", "daegu_key": "laptop"},
    
    # 종이류
    "종이류-기타": {"api_category": "재활용품", "api_type": "종이", "daegu_key": None},
    "종이류-노트": {"api_category": "재활용품", "api_type": "종이", "daegu_key": "book"},
    "종이류-상자류": {"api_category": "재활용품", "api_type": "종이", "daegu_key": None},
    "종이류-신문지": {"api_category": "재활용품", "api_type": "종이", "daegu_key": None},
    "종이류-음료수곽": {"api_category": "재활용품", "api_type": "종이", "daegu_key": None},
    "종이류-종이봉투": {"api_category": "재활용품", "api_type": "종이", "daegu_key": None},
    "종이류-책자": {"api_category": "재활용품", "api_type": "종이", "daegu_key": "book"},
    
    # 캔류
    "캔류-기타": {"api_category": "재활용품", "api_type": "캔", "daegu_key": None},
    "캔류-맥주캔": {"api_category": "재활용품", "api_type": "캔", "daegu_key": None},
    "캔류-음료수캔": {"api_category": "재활용품", "api_type": "캔", "daegu_key": None},
    "캔류-커피캔": {"api_category": "재활용품", "api_type": "캔", "daegu_key": None},
    
    # 페트병
    "페트병-기타": {"api_category": "재활용품", "api_type": "플라스틱", "daegu_key": None},
    "페트병-일회용음료수잔": {"api_category": "재활용품", "api_type": "플라스틱", "daegu_key": None},
    "페트병-페트병": {"api_category": "재활용품", "api_type": "플라스틱", "daegu_key": None},
    
    # 플라스틱류
    "플라스틱류-기타": {"api_category": "재활용품", "api_type": "플라스틱", "daegu_key": None},
    "플라스틱류-대용량플라스틱통": {"api_category": "재활용품", "api_type": "플라스틱", "daegu_key": None},
    "플라스틱류-밀폐용기": {"api_category": "재활용품", "api_type": "플라스틱", "daegu_key": None},
    "플라스틱류-장남감": {"api_category": "유아용품", "api_type": "장난감", "daegu_key": "teddy_bear"}
}

# 영어 클래스와 API/대구 매핑 (백업용)
ENGLISH_TO_API_MAPPING = {
    # 재활용품
    "bottle": {"api_category": "재활용품", "api_type": "플라스틱", "daegu_key": None},
    "wine glass": {"api_category": "재활용품", "api_type": "유리", "daegu_key": None},
    "cup": {"api_category": "재활용품", "api_type": "플라스틱", "daegu_key": None},
    
    # 가전제품
    "tv": {"api_category": "가전제품", "api_type": "T.V", "daegu_key": "tv_small"},
    "laptop": {"api_category": "가전제품", "api_type": "컴퓨터, 노트북", "daegu_key": "laptop"},
    "cell phone": {"api_category": "가전제품", "api_type": "기타 소형가전", "daegu_key": "cell_phone"},
    "remote": {"api_category": "가전제품", "api_type": "기타 소형가전", "daegu_key": "remote"},
    "keyboard": {"api_category": "가전제품", "api_type": "기타 소형가전", "daegu_key": "keyboard"},
    "mouse": {"api_category": "가전제품", "api_type": "기타 소형가전", "daegu_key": "mouse"},
    "microwave": {"api_category": "가전제품", "api_type": "전자렌지", "daegu_key": "microwave"},
    "oven": {"api_category": "가전제품", "api_type": "전기오븐렌지", "daegu_key": "oven"},
    "toaster": {"api_category": "가전제품", "api_type": "기타 소형가전", "daegu_key": "toaster"},
    "refrigerator": {"api_category": "가전제품", "api_type": "냉장고", "daegu_key": "refrigerator_medium"},
    
    # 가구류
    "chair": {"api_category": "가구류", "api_type": "의자", "daegu_key": "chair_small"},
    "couch": {"api_category": "가구류", "api_type": "쇼파", "daegu_key": "couch_single"},
    "bed": {"api_category": "가구류", "api_type": "침대", "daegu_key": "bed_single"},
    "dining table": {"api_category": "가구류", "api_type": "식탁", "daegu_key": "dining_table_small"},
    
    # 기타
    "toilet": {"api_category": "욕실용품", "api_type": "변기", "daegu_key": "toilet"},
    "sink": {"api_category": "욕실용품", "api_type": "세면대", "daegu_key": "sink"},
    "vase": {"api_category": "기타류", "api_type": "화분", "daegu_key": "vase"},
    "potted plant": {"api_category": "기타류", "api_type": "화분", "daegu_key": "potted_plant_small"},
    "teddy bear": {"api_category": "유아용품", "api_type": "장난감", "daegu_key": "teddy_bear"}
}

# 주요 객체 우선순위 설정 (페트병 우선)
PRIORITY_CLASSES = {
    # 커스텀 클래스 (가장 높은 우선순위)
    "페트병-페트병": 100,
    "페트병-기타": 95,
    "페트병-일회용음료수잔": 95,
    "플라스틱류-기타": 90,
    "플라스틱류-대용량플라스틱통": 90,
    "플라스틱류-밀폐용기": 90,
    "유리병-기타": 85,
    "유리병-기타술병": 85,
    "유리병-맥주병": 85,
    "유리병-물병": 85,
    "유리병-소주병": 85,
    "유리병-음료수병": 85,
    "캔류-기타": 80,
    "캔류-맥주캔": 80,
    "캔류-음료수캔": 80,
    "캔류-커피캔": 80,
    
    # 영어 클래스 (중간 우선순위)
    "bottle": 75,
}

# 무시해야 할 클래스 (낮은 신뢰도에서 발생하는 오인식)
IGNORE_CLASSES = ["bowl", "mouse", "dining table", "cup", "remote", "keyboard", "scissors", "spoon", "fork", "knife"]

# 이미지 중앙에 위치한 객체에 가중치를 부여하는 함수
def apply_central_object_priority(detections, image_width, image_height):
    """
    이미지 중앙에 있는 객체에 우선순위를 부여하되, 신뢰도 상한 설정
    """
    # 이미지 중심점
    center_x = image_width / 2
    center_y = image_height / 2
    
    for det in detections:
        # 바운딩 박스 좌표
        x1, y1, x2, y2 = det['box']
        
        # 바운딩 박스 중심점
        box_center_x = (x1 + x2) / 2
        box_center_y = (y1 + y2) / 2
        
        # 중심점까지의 거리 계산 (정규화)
        dx = (box_center_x - center_x) / (image_width / 2)
        dy = (box_center_y - center_y) / (image_height / 2)
        distance = np.sqrt(dx*dx + dy*dy)
        
        # 중앙에 가까울수록 높은 중심 점수 (0~1)
        center_score = max(0, 1 - distance)
        
        # 바운딩 박스 크기 계산 (정규화된 면적)
        box_width = (x2 - x1) / image_width
        box_height = (y2 - y1) / image_height
        size_score = box_width * box_height * 4  # 면적이 전체 이미지의 1/4이면 1점
        
        # 최종 위치 가중치 계산 (중심 위치 + 크기)
        position_weight = (center_score * 0.7) + (size_score * 0.3)
        position_weight = min(0.3, position_weight)  # 최대 0.3으로 제한 (더 줄임)
        
        # 원래 신뢰도에 위치 가중치 적용
        original_conf = min(det['conf'], 1.0)  # 원본 신뢰도도 1.0 이하로 제한
        
        # 클래스 우선순위 가중치 (축소)
        class_priority = PRIORITY_CLASSES.get(det['cls_name'], 0) / 300.0  # 300으로 나누어 최대 0.33으로 제한
        
        # 최종 조정된 신뢰도 계산 - 상한 설정
        adjusted_conf = original_conf * (1 + position_weight) * (1 + class_priority)
        
        # 신뢰도를 1.0(100%) 이하로 제한
        adjusted_conf = min(adjusted_conf, 1.0)
        
        # 조정된 신뢰도 저장
        det['original_conf'] = original_conf
        det['position_weight'] = position_weight
        det['class_priority'] = class_priority
        det['adjusted_conf'] = adjusted_conf
    
    # 조정된 신뢰도로 정렬
    detections = sorted(detections, key=lambda x: x['adjusted_conf'], reverse=True)
    
    return detections

def merge_detections(detections, iou_threshold=0.5):
    """
    중복 감지된 객체 병합 (NMS 알고리즘) - 개선된 버전
    """
    if not detections:
        return []
    
    # 신뢰도 순으로 정렬
    detections = sorted(detections, key=lambda x: x['conf'], reverse=True)
    
    merged_detections = []
    used = [False] * len(detections)
    
    for i in range(len(detections)):
        if used[i]:
            continue
        
        # 현재 박스 선택
        current = detections[i].copy()  # 복사본 사용
        current['conf'] = min(current['conf'], 1.0)  # 신뢰도 제한
        used[i] = True
        
        # 무시해야 할 클래스 필터링
        if current['cls_name'] in IGNORE_CLASSES and current['conf'] < 0.5:
            continue  # 낮은 신뢰도의 무시해야할 클래스는 건너뛰기
            
        merged_detections.append(current)
        
        # 현재 박스와 중복되는 다른 박스 확인
        for j in range(i+1, len(detections)):
            if used[j]:
                continue
            
            # 같은 클래스의 박스만 비교 (다른 클래스는 다른 객체)
            if current['cls_name'] != detections[j]['cls_name']:
                continue
            
            # IoU 계산
            iou = calculate_iou(current['box'], detections[j]['box'])
            
            # 중복 박스 처리
            if iou > iou_threshold:
                used[j] = True
                
                # 신뢰도 계산 방식 변경 - 단순 최대값 사용
                current['conf'] = max(current['conf'], min(detections[j]['conf'], 1.0))
                current['conf'] = min(current['conf'], 1.0)  # 다시 한번 제한
    
    return merged_detections

# 병 종류 분석 함수 (페트병 vs 유리병)
def analyze_bottle_type(image, xmin, ymin, xmax, ymax):
    """
    병 종류 분석 함수 - 페트병과 유리병 구분
    """
    try:
        # 바운딩 박스 좌표를 정수로 변환
        xmin, ymin, xmax, ymax = int(xmin), int(ymin), int(xmax), int(ymax)
        
        # 이미지를 numpy 배열로 변환
        img_array = np.array(image)
        
        # 이미지 차원 확인 및 바운딩 박스 범위 조정
        h, w = img_array.shape[:2]
        xmin = max(0, xmin)
        ymin = max(0, ymin)
        xmax = min(w, xmax)
        ymax = min(h, ymax)
        
        # 바운딩 박스 영역이 유효한지 확인
        if xmin >= xmax or ymin >= ymax:
            return "플라스틱"  # 기본값
        
        # 바운딩 박스 영역 추출
        bottle_region = img_array[ymin:ymax, xmin:xmax]
        
        if bottle_region.size == 0:
            return "플라스틱"  # 기본값
        
        # HSV 색공간으로 변환
        if len(bottle_region.shape) == 3:  # RGB 이미지 확인
            bottle_hsv = cv2.cvtColor(bottle_region, cv2.COLOR_RGB2HSV)
            
            # 채도(Saturation) 분석
            avg_saturation = np.mean(bottle_hsv[:, :, 1])
            
            # 밝기(Value) 분석
            avg_value = np.mean(bottle_hsv[:, :, 2])
            
            # 색상 편차(표준편차) 분석 - 유리병은 주변 색상이 더 균일한 경향
            color_std = np.std(bottle_region)
            
            # 투명도 추정 - 밝기의 분포 패턴
            # RGB 채널 평균값의 표준편차 (투명할수록 채널 간 차이가 적음)
            channel_means = [np.mean(bottle_region[:,:,i]) for i in range(3)]
            channel_std = np.std(channel_means)
            
            # 에지 검출 (유리병은 에지가 더 선명한 경향)
            gray = cv2.cvtColor(bottle_region, cv2.COLOR_RGB2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / edges.size
            
            print(f"병 분석 - 채도: {avg_saturation:.2f}, 밝기: {avg_value:.2f}, 색상 편차: {color_std:.2f}, 채널 표준편차: {channel_std:.2f}, 에지 밀도: {edge_density:.4f}")
            
            # 컬러 히스토그램 분석 (유리병은 특정 색상이 두드러지지 않음)
            color_hist = cv2.calcHist([bottle_region], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
            color_hist = cv2.normalize(color_hist, color_hist).flatten()
            color_hist_std = np.std(color_hist)
            
            # 라벨 영역 분석 (페트병은 보통 라벨이 있음 - 색상 변화가 큼)
            has_label = False
            if bottle_region.shape[0] > 50:  # 충분히 큰 이미지인 경우
                # 세로 방향으로 색상 변화 탐지 (라벨 경계 탐지)
                vertical_color_change = []
                for y in range(1, bottle_region.shape[0]):
                    diff = np.mean(np.abs(bottle_region[y, :] - bottle_region[y-1, :]))
                    vertical_color_change.append(diff)
                
                # 색상 변화가 급격한 지점의 개수
                color_change_threshold = np.mean(vertical_color_change) * 2
                color_change_points = np.sum(np.array(vertical_color_change) > color_change_threshold)
                
                # 라벨이 있을 가능성
                has_label = color_change_points > 3
            
            # 사진에서 주로 페트병은 라벨이 있고 유리병보다 색상 변화가 큰 경향이 있음
            # 유리병은 채도가 낮고, 투명도가 높고, 채널 간 차이가 적은 경향이 있음
            
            # 투명한 유리병의 특성
            is_glass = (
                avg_saturation < 60 and    # 낮은 채도
                color_std < 45 and         # 낮은 색상 편차 
                channel_std < 15 and       # 채널 간 표준편차가 낮음
                edge_density > 0.02 and    # 에지가 선명함
                color_hist_std < 0.1       # 컬러 히스토그램이 균일함
            )
            
            # 라벨이 감지되면 페트병일 가능성이 높음
            if has_label:
                is_glass = False
            
            # 추가적으로 페트병이 가진 특징 체크
            # - 색상이 있는 뚜껑이 있는 경우 (페트병 가능성 증가)
            has_colored_cap = False
            if ymin < bottle_region.shape[0] // 4:  # 상단 1/4 부분 확인
                top_region = bottle_region[:bottle_region.shape[0]//4, :]
                top_saturation = np.mean(cv2.cvtColor(top_region, cv2.COLOR_RGB2HSV)[:, :, 1])
                top_color_std = np.std(top_region)
                has_colored_cap = top_saturation > 70 or top_color_std > 50
            
            if has_colored_cap:
                is_glass = False
            
            # 결과 판정 (사진은 대부분 페트병이므로 유리병 조건을 엄격하게 유지)
            if is_glass:
                print("분석 결과: 유리병")
                return "유리"
            else:
                print("분석 결과: 플라스틱병")
                return "플라스틱"
        else:
            return "플라스틱"  # 비RGB 이미지의 경우 기본값
    except Exception as e:
        print(f"병 종류 분석 오류: {e}")
        import traceback
        traceback.print_exc()
        return "플라스틱"  # 오류 시 기본값

# 이미지 전처리 함수 (인식률 개선)
def preprocess_image(image_data):
    """
    이미지를 전처리하여 객체 감지 성능 향상
    """
    try:
        # 원본 이미지 로드
        image = Image.open(io.BytesIO(image_data))
        
        # 이미지 크기 조정 (YOLO 최적 크기)
        width, height = image.size
        target_size = 640  # YOLO 모델의 최적 입력 크기
        
        # 이미지 크기를 YOLO 최적 사이즈에 맞게 조정
        if width > height:
            new_width = target_size
            new_height = int(height * (target_size / width))
        else:
            new_height = target_size
            new_width = int(width * (target_size / height))
        
        # 이미지 리사이즈 (고품질 보간법 사용)
        resized_image = image.resize((new_width, new_height), Image.LANCZOS)
        
        # 이미지 품질 개선 (백색 균형 및 조명 보정)
        # 대비 개선 - 객체 경계를 더 뚜렷하게
        enhanced_image = ImageEnhance.Contrast(resized_image).enhance(1.2)
        
        # 선명도 향상 - 약하게 적용
        enhanced_image = ImageEnhance.Sharpness(enhanced_image).enhance(1.3)
        
        # 밝기 자동 조정 (필요한 경우)
        brightness_value = ImageStat.Stat(enhanced_image).mean[0] / 255.0
        if brightness_value < 0.4:  # 이미지가 어두운 경우
            enhanced_image = ImageEnhance.Brightness(enhanced_image).enhance(1.2)
        elif brightness_value > 0.8:  # 이미지가 너무 밝은 경우
            enhanced_image = ImageEnhance.Brightness(enhanced_image).enhance(0.9)
        
        # 처리된 이미지 저장
        temp_image_path = "temp_image_processed.jpg"
        enhanced_image.save(temp_image_path, quality=95)
        
        return temp_image_path, enhanced_image
    
    except Exception as e:
        print(f"이미지 전처리 오류: {e}")
        import traceback
        traceback.print_exc()
        
        # 오류 발생시 원본 이미지 사용
        try:
            image = Image.open(io.BytesIO(image_data))
            temp_image_path = "temp_image_original.jpg"
            image.save(temp_image_path)
            return temp_image_path, image
        except:
            return None, None

# YOLO 모델 로드 함수 (성능 최적화)
def load_model():
    try:
        # GPU 사용 가능 여부 확인
        device = 'cuda:0' if torch.cuda.is_available() else 'cpu'
        print(f"사용 중인 장치: {device}")
        
        # 학습된 커스텀 모델 로드 시도
        if os.path.exists(CUSTOM_MODEL_PATH):
            print(f"커스텀 모델 로드 중: {CUSTOM_MODEL_PATH}")
            model = YOLO(CUSTOM_MODEL_PATH)
            
            # 모델 성능 최적화
            model.to(device)  # GPU로 모델 이동 (가능한 경우)
            
            print(f"커스텀 모델 로드 성공")
            # 모델의 클래스 목록 확인
            print(f"감지 가능한 클래스: {model.names}")
            
            # 앙상블 모델 로드 (옵션)
            ensemble_model = None
            if os.path.exists(ENSEMBLE_MODEL_PATH) and ENSEMBLE_MODEL_PATH != CUSTOM_MODEL_PATH:
                print(f"앙상블용 보조 모델 로드 중: {ENSEMBLE_MODEL_PATH}")
                ensemble_model = YOLO(ENSEMBLE_MODEL_PATH)
                ensemble_model.to(device)
                print(f"앙상블 모델 로드 성공")
            
            return model, ensemble_model
        else:
            # 커스텀 모델이 없는 경우 기본 모델 로드
            print(f"커스텀 모델을 찾을 수 없습니다. 기본 모델 로드 중: {DEFAULT_MODEL_NAME}")
            model = YOLO(DEFAULT_MODEL_NAME)
            model.to(device)
            print(f"기본 모델 로드 성공: {DEFAULT_MODEL_NAME}")
            return model, None
    except Exception as e:
        print(f"모델 로딩 오류: {e}")
        import traceback
        traceback.print_exc()
        try:
            # 오류 발생 시 기본 모델 시도
            print(f"기본 모델 로드 시도 중: {DEFAULT_MODEL_NAME}")
            model = YOLO(DEFAULT_MODEL_NAME)
            device = 'cuda:0' if torch.cuda.is_available() else 'cpu'
            model.to(device)
            print(f"기본 모델 로드 성공: {DEFAULT_MODEL_NAME}")
            return model, None
        except Exception as e2:
            print(f"기본 모델 로딩 오류: {e2}")
            return None, None

# API에서 폐기물 데이터 가져오기
def fetch_waste_types():
    try:
        response = requests.get(WASTE_API_URL)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"API 오류: {response.status_code}")
            return {}
    except Exception as e:
        print(f"API 요청 오류: {e}")
        return {}

# 여러 소스에서 가격 정보 가져오기
def get_price_from_sources(category, waste_type, daegu_key, waste_api_data):
    try:
        # 1. 먼저 API에서 가격 찾기
        if waste_api_data and category in waste_api_data and waste_api_data[category]:
            matching_items = [item for item in waste_api_data[category] if item["type"] == waste_type]
            
            if matching_items:
                item = matching_items[0]
                return {
                    "price": item["price"],
                    "source": "api"
                }
        
        # 2. API에 없으면 대구시 가격표에서 찾기
        if daegu_key and daegu_key in DAEGU_WASTE_PRICES:
            return {
                "price": DAEGU_WASTE_PRICES[daegu_key],
                "source": "daegu"
            }
        
        # 3. 카테고리별 기본 가격 사용
        if category == "재활용품" and "default_recyclable" in DAEGU_WASTE_PRICES:
            return {
                "price": DAEGU_WASTE_PRICES["default_recyclable"],
                "source": "daegu_default"
            }
        elif category == "일반쓰레기" and "default_general" in DAEGU_WASTE_PRICES:
            return {
                "price": DAEGU_WASTE_PRICES["default_general"],
                "source": "daegu_default"
            }
        
        # 4. 최종 기본값
        return {
            "price": 1000,
            "source": "default"
        }
    
    except Exception as e:
        print(f"가격 정보 추출 오류: {e}")
        return {
            "price": 1000,
            "source": "default_error"
        }

# 업데이트된 가격 정보 가져오는 함수
def get_waste_info_with_price(class_name, image, x1, y1, x2, y2, waste_api_data):
    # 기본 응답 정보
    default_info = {
        "category": "일반쓰레기",
        "type": "기타",
        "price": 1000,
        "price_source": "default"
    }
    
    try:
        # 1. 한글 커스텀 클래스 매핑에서 검색
        if class_name in CUSTOM_MODEL_API_MAPPING:
            mapping = CUSTOM_MODEL_API_MAPPING[class_name]
            category = mapping["api_category"]
            waste_type = mapping["api_type"]
            daegu_key = mapping["daegu_key"]
            
            # 매핑 정보 출력
            print(f"클래스 {class_name} 매핑: 카테고리={category}, 타입={waste_type}, 대구키={daegu_key}")
            
            # 병 종류 특수 처리 (페트병/유리병 구분)
            if "페트병" in class_name or "유리병" in class_name or "병" in class_name:
                bottle_type = analyze_bottle_type(image, x1, y1, x2, y2)
                
                # 분석 결과에 따라 유형 변경
                if bottle_type == "유리" and waste_type == "플라스틱":
                    waste_type = "유리"
                elif bottle_type == "플라스틱" and waste_type == "유리":
                    waste_type = "플라스틱"
            
            # 가격 정보 가져오기
            price_info = get_price_from_sources(category, waste_type, daegu_key, waste_api_data)
            
            return {
                "category": category,
                "type": waste_type,
                "price": price_info["price"],
                "price_source": price_info["source"]
            }
        
        # 2. 영어 클래스 매핑 (백업)
        elif class_name in ENGLISH_TO_API_MAPPING:
            mapping = ENGLISH_TO_API_MAPPING[class_name]
            category = mapping["api_category"]
            waste_type = mapping["api_type"]
            daegu_key = mapping["daegu_key"]
            
            # 병 종류 특수 처리 (영어 class_name의 경우)
            if class_name.lower() == "bottle":
                bottle_type = analyze_bottle_type(image, x1, y1, x2, y2)
                waste_type = bottle_type  # 유리 또는 플라스틱
            
            # 가격 정보 가져오기
            price_info = get_price_from_sources(category, waste_type, daegu_key, waste_api_data)
            
            return {
                "category": category,
                "type": waste_type,
                "price": price_info["price"],
                "price_source": price_info["source"]
            }
        
        # 3. 매핑 없을 경우 기본값 반환
        else:
            print(f"매핑되지 않은 클래스: {class_name}, 기본값 사용")
            return default_info
            
    except Exception as e:
        print(f"폐기물 정보 추출 오류: {e}")
        import traceback
        traceback.print_exc()
        return default_info


# IoU(Intersection over Union) 계산 함수
def calculate_iou(box1, box2):
    """
    두 바운딩 박스의 IoU 계산
    box1, box2: [x1, y1, x2, y2] 형식의 바운딩 박스 좌표
    """
    # 박스 좌표 추출
    x1_1, y1_1, x2_1, y2_1 = box1
    x1_2, y1_2, x2_2, y2_2 = box2
    
    # 교차 영역 계산
    x_left = max(x1_1, x1_2)
    y_top = max(y1_1, y1_2)
    x_right = min(x2_1, x2_2)
    y_bottom = min(y2_1, y2_2)
    
    # 교차 영역이 없으면 IoU = 0
    if x_right < x_left or y_bottom < y_top:
        return 0.0
    
    # 교차 영역 넓이 계산
    intersection_area = (x_right - x_left) * (y_bottom - y_top)
    
    # 각 박스의 넓이 계산
    box1_area = (x2_1 - x1_1) * (y2_1 - y1_1)
    box2_area = (x2_2 - x1_2) * (y2_2 - y1_2)
    
    # 합집합 넓이 계산
    union_area = box1_area + box2_area - intersection_area
    
    # IoU 계산
    iou = intersection_area / union_area
    
    return iou

# 객체 감지 결과 필터링 함수 (페트병 우선)
def filter_detections(detections, min_confidence=0.25):
    """
    객체 감지 결과에서 페트병 등 우선 순위가 높은 객체를 우선하고
    신뢰도가 낮은 객체를 필터링하는 함수
    """
    if not detections:
        return []
    
    # 신뢰도 임계값 이하 필터링
    filtered = [d for d in detections if d['conf'] > min_confidence]
    
    # 무시해야 할 클래스 필터링 (낮은 신뢰도)
    filtered = [d for d in filtered if not (d['cls_name'] in IGNORE_CLASSES and d['conf'] < 0.5)]
    
    # 우선순위 클래스가 있는지 확인
    priority_detections = [d for d in filtered if d['cls_name'] in PRIORITY_CLASSES]
    
    # 검출된 우선 객체가 있고, 충분한 신뢰도를 가지면 해당 객체만 반환
    bottle_detections = [d for d in priority_detections if d['conf'] > 0.3 and 
                          (d['cls_name'] in ["페트병-페트병", "페트병-기타", "페트병-일회용음료수잔", 
                                           "유리병-기타", "유리병-기타술병", "유리병-맥주병", 
                                           "유리병-물병", "유리병-소주병", "유리병-음료수병", 
                                           "bottle"])]
    
    if bottle_detections:
        # 페트병/유리병이 감지되었을 경우, 이 객체들만 반환
        return bottle_detections
    elif priority_detections:
        # 우선 객체가 있으면 해당 객체 반환
        return priority_detections
    else:
        # 그 외의 경우 모든 필터링된 객체 반환
        return filtered

# 앙상블 방식의 객체 인식 (여러 모델 결과 조합)
def ensemble_detect(image_path, model, ensemble_model=None, conf_threshold=0.15):
    """
    앙상블 방식으로 여러 모델의 결과를 결합하여 정확도 향상
    """
    try:
        # 1. 기본 모델로 감지 (여러 크기로 감지)
        results_main = model(image_path, conf=conf_threshold)
        
        detections = []
        
        # 2. 앙상블 모델(백업)이 있으면 추가 감지 수행
        if ensemble_model is not None:
            results_ensemble = ensemble_model(image_path, conf=conf_threshold)
            
            # 메인 모델 결과 처리
            for r in results_main:
                for box in r.boxes:
                    # 신뢰도 값을 1.0 이하로 제한
                    conf_value = float(box.conf[0])
                    conf_value = min(conf_value, 1.0)
                    detections.append({
                        'box': box.xyxy[0].tolist(),
                        'conf': conf_value,
                        'cls': int(box.cls[0]),
                        'cls_name': model.names[int(box.cls[0])],
                        'source': 'main'
                    })
            
            # 앙상블 모델 결과 처리 (일부 모델은 클래스가 다를 수 있음)
            for r in results_ensemble:
                for box in r.boxes:
                    cls_idx = int(box.cls[0])
                    # 앙상블 모델에 해당 클래스가 있는 경우만 추가
                    if cls_idx < len(ensemble_model.names):
                        cls_name = ensemble_model.names[cls_idx]
                        # 신뢰도 값을 1.0 이하로 제한
                        conf_value = float(box.conf[0])
                        conf_value = min(conf_value, 1.0)
                        detections.append({
                            'box': box.xyxy[0].tolist(),
                            'conf': conf_value,
                            'cls': cls_idx,
                            'cls_name': cls_name,
                            'source': 'ensemble'
                        })
        else:
            # 앙상블 모델이 없는 경우, 메인 모델 결과만 처리
            for r in results_main:
                for box in r.boxes:
                    # 신뢰도 값을 1.0 이하로 제한
                    conf_value = float(box.conf[0])
                    conf_value = min(conf_value, 1.0)
                    detections.append({
                        'box': box.xyxy[0].tolist(),
                        'conf': conf_value,
                        'cls': int(box.cls[0]),
                        'cls_name': model.names[int(box.cls[0])],
                        'source': 'main'
                    })
        
        # 이미지 정보 가져오기 (중앙 객체 우선순위 적용을 위해)
        try:
            img = cv2.imread(image_path)
            img_height, img_width = img.shape[:2]
        except:
            img_width, img_height = 640, 640  # 기본값
        
        # 3. 중복 박스 제거 및 신뢰도 병합
        merged_detections = merge_detections(detections)
        
        # 4. 이미지 중앙 객체에 가중치 부여
        prioritized_detections = apply_central_object_priority(merged_detections, img_width, img_height)
        
        # 5. 객체 필터링 (페트병 우선)
        final_detections = filter_detections(prioritized_detections)
        
        return final_detections
    
    except Exception as e:
        print(f"앙상블 감지 오류: {e}")
        import traceback
        traceback.print_exc()
        return []

# 개선된 이미지 처리 및 객체 인식 함수
# 먼저 detect_waste 함수에서 신뢰도를 100% 이하로 제한하는 로직 추가
def detect_waste(image_data, model, waste_api_data, ensemble_model=None):
    try:
        start_time = time.time()
        
        # 1. 이미지 전처리 (성능 향상)
        temp_image_path, pil_image = preprocess_image(image_data)
        
        if temp_image_path is None or pil_image is None:
            raise Exception("이미지 전처리 실패")
        
        # 2. 앙상블 방식으로 객체 감지 (정확도 향상)
        detections_raw = ensemble_detect(temp_image_path, model, ensemble_model, conf_threshold=0.15)
        
        # 임시 파일 삭제
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)
        
        # 3. 결과 처리 및 매핑
        detections = []
        
        for det in detections_raw:
            x1, y1, x2, y2 = det['box']
            class_name = det['cls_name']
            
            # 신뢰도를 확실히 제한
            conf = min(det.get('adjusted_conf', det['conf']), 1.0)
            
            # 로그에 출력될 신뢰도도 제한하여 표시
            print(f"감지된 객체: {class_name}, 신뢰도: {min(conf, 1.0):.2f}")
            
            # 클래스 매핑 및 정보 추출
            waste_info = get_waste_info_with_price(class_name, pil_image, x1, y1, x2, y2, waste_api_data)
            
            # 신뢰도를 100% 이하로 변환 후 백분율로 변환
            confidence_pct = round(min(conf, 1.0) * 100, 1)
            
            detections.append({
                "class_name": class_name,
                "category": waste_info["category"],
                "type": waste_info["type"],
                "price": waste_info["price"],
                "price_source": waste_info["price_source"],
                "confidence": confidence_pct,  # 백분율로 변환 (최대 100%)
                "bbox": [round(coord, 1) for coord in [x1, y1, x2, y2]]  # 소수점 줄여서 용량 감소
            })
        
        # 처리 시간 계산
        processing_time = time.time() - start_time
        print(f"폐기물 감지 처리 시간: {processing_time:.2f}초")
        
        return detections
    except Exception as e:
        print(f"객체 감지 오류: {e}")
        import traceback
        traceback.print_exc()
        return []


# 5. map_to_waste_types 함수 수정 - 객체별로 별도 표시 및 신뢰도 한계 설정
def map_to_waste_types(detections, waste_types):
    try:
        mapped_items = []
        for detection in detections:
            category = detection["category"]
            waste_type = detection["type"]
            price = detection["price"]
            price_source = detection.get("price_source", "unknown")
            
            # 신뢰도가 100%를 넘지 않도록 확실히 제한
            confidence = min(detection["confidence"], 100.0)
            
            # 기본 정보
            item_info = {
                "category": category,
                "type": waste_type,
                "description": f"{waste_type}",
                "price": price,
                "quantity": 1,  # 항상 1개씩 (합치지 않음)
                "totalPrice": price,
                "confidence": confidence,
                "price_source": price_source
            }
            
            # API에서 더 상세한 정보 가져오기 (있는 경우)
            if category in waste_types and waste_types[category]:
                matching_items = [item for item in waste_types[category] 
                                 if item["type"] == waste_type]
                
                if matching_items:
                    api_item = matching_items[0]
                    item_info["description"] = api_item.get("description", f"{waste_type}")
                    
                    # API 가격이 우선이므로 여기서 업데이트하지 않음
                    # price_source가 이미 'api'인 경우에만 적용
                    if price_source == "api":
                        item_info["price"] = api_item["price"]
                        item_info["totalPrice"] = api_item["price"]
            
            mapped_items.append(item_info)
        
        # 중복 제거 로직을 제거 - 각 객체를 별도로 유지
        # 신뢰도 순으로 정렬만 수행
        sorted_items = sorted(mapped_items, key=lambda x: x["confidence"], reverse=True)
        
        return sorted_items
    except Exception as e:
        print(f"폐기물 매핑 오류: {e}")
        import traceback
        traceback.print_exc()
        return []



# apply_central_object_priority 함수 수정 - 신뢰도 상한 설정
def apply_central_object_priority(detections, image_width, image_height):
    """
    이미지 중앙에 있는 객체에 우선순위를 부여하되, 신뢰도 상한 설정
    """
    # 이미지 중심점
    center_x = image_width / 2
    center_y = image_height / 2
    
    for det in detections:
        # 바운딩 박스 좌표
        x1, y1, x2, y2 = det['box']
        
        # 바운딩 박스 중심점
        box_center_x = (x1 + x2) / 2
        box_center_y = (y1 + y2) / 2
        
        # 중심점까지의 거리 계산 (정규화)
        dx = (box_center_x - center_x) / (image_width / 2)
        dy = (box_center_y - center_y) / (image_height / 2)
        distance = np.sqrt(dx*dx + dy*dy)
        
        # 중앙에 가까울수록 높은 중심 점수 (0~1)
        center_score = max(0, 1 - distance)
        
        # 바운딩 박스 크기 계산 (정규화된 면적)
        box_width = (x2 - x1) / image_width
        box_height = (y2 - y1) / image_height
        size_score = box_width * box_height * 4  # 면적이 전체 이미지의 1/4이면 1점
        
        # 원래 신뢰도 (이미 제한됨)
        original_conf = min(det['conf'], 1.0)
        
        # 완전히 다른 접근 방식 - 가중치를 적용하지 않고 신뢰도 점수를 추가
        position_score = (center_score * 0.7 + size_score * 0.3) * 0.15  # 최대 15% 추가
        class_priority_score = PRIORITY_CLASSES.get(det['cls_name'], 0) / 1000.0  # 최대 10% 추가
        
        # 신뢰도 점수 계산 방식 변경 (곱셈 대신 덧셈)
        adjusted_conf = original_conf + position_score + class_priority_score
        adjusted_conf = min(adjusted_conf, 1.0)  # 1.0이 최대
        
        # 조정된 신뢰도 저장
        det['original_conf'] = original_conf
        det['adjusted_conf'] = adjusted_conf
    
    # 조정된 신뢰도로 정렬
    detections = sorted(detections, key=lambda x: x['adjusted_conf'], reverse=True)
    
    return detections
    
# API 엔드포인트: 폐기물 인식 (정확도 향상)
@app.route('/api/detect-waste', methods=['POST'])
def detect_waste_api():
    try:
        # 이미지 데이터 받기
        if 'image' not in request.files and 'image' not in request.form:
            return jsonify({"error": "이미지가 제공되지 않았습니다"}), 400
        
        # 파일 또는 base64 형식 처리
        if 'image' in request.files:
            image_data = request.files['image'].read()
        else:
            # base64 디코딩
            image_base64 = request.form['image']
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            image_data = base64.b64decode(image_base64)
        
        # 폐기물 유형 데이터 가져오기
        waste_types = fetch_waste_types()
        
        # 모델이 로드되지 않은 경우 로드
        if not hasattr(app, 'model') or not hasattr(app, 'ensemble_model'):
            app.model, app.ensemble_model = load_model()
            
        if app.model is None:
            return jsonify({"error": "모델을 로드할 수 없습니다"}), 500
        
        # 폐기물 인식 (개선된 함수 사용)
        detections = detect_waste(image_data, app.model, waste_types, app.ensemble_model)
        
        # 인식된 객체가 없는 경우
        if not detections:
            # 페트병으로 기본 설정 (페트병 이미지가 많은 경우)
            default_detection = {
                "class_name": "페트병-페트병",
                "category": "재활용품",
                "type": "플라스틱",
                "price": 1000,
                "price_source": "default",
                "confidence": 80.0,  # 기본 신뢰도 80%
                "bbox": [0, 0, 100, 100]  # 기본 바운딩 박스
            }
            
            detections = [default_detection]
            
            return jsonify({
                "success": True,
                "message": "기본 페트병으로 인식했습니다.",
                "detections": detections,
                "mapped_items": map_to_waste_types(detections, waste_types)
            })
        
        # API 데이터와 매핑 (개선된 함수 사용)
        mapped_items = map_to_waste_types(detections, waste_types)
        
        # 결과 반환
        return jsonify({
            "success": True,
            "detections": detections,
            "mapped_items": mapped_items,
            "model": {
                "name": CUSTOM_MODEL_PATH if os.path.exists(CUSTOM_MODEL_PATH) else DEFAULT_MODEL_NAME,
                "type": "custom" if os.path.exists(CUSTOM_MODEL_PATH) else "default"
            }
        })
    
    except Exception as e:
        print(f"API 오류: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# 모델 정보 반환 API
@app.route('/api/model-info', methods=['GET'])
def model_info():
    try:
        if hasattr(app, 'model'):
            model_type = "custom" if os.path.exists(CUSTOM_MODEL_PATH) else "default"
            model_path = CUSTOM_MODEL_PATH if os.path.exists(CUSTOM_MODEL_PATH) else DEFAULT_MODEL_NAME
            
            # 앙상블 모델 정보 추가
            ensemble_info = None
            if hasattr(app, 'ensemble_model') and app.ensemble_model is not None:
                ensemble_info = {
                    "name": ENSEMBLE_MODEL_PATH,
                    "status": "loaded"
                }
            
            return jsonify({
                "model_name": model_path,
                "model_type": model_type,
                "classes": app.model.names,
                "status": "loaded",
                "ensemble_model": ensemble_info,
                "priority_classes": list(PRIORITY_CLASSES.keys()),
                "ignore_classes": IGNORE_CLASSES
            })
        else:
            return jsonify({
                "model_name": CUSTOM_MODEL_PATH if os.path.exists(CUSTOM_MODEL_PATH) else DEFAULT_MODEL_NAME,
                "model_type": "not_loaded",
                "status": "not_loaded"
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 테스트용 엔드포인트 (개발 중 테스트)
@app.route('/api/test-bottle-detection', methods=['POST'])
def test_bottle_detection():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "이미지가 제공되지 않았습니다"}), 400
            
        image_data = request.files['image'].read()
        image = Image.open(io.BytesIO(image_data))
        
        # 테스트용 바운딩 박스 (이미지 전체)
        width, height = image.size
        bottle_type = analyze_bottle_type(image, 0, 0, width, height)
        
        # 이미지 분석 결과
        result = {
            "detected_type": bottle_type,
            "message": f"이 병은 {bottle_type} 타입으로 분석되었습니다.",
            "image_size": {"width": width, "height": height}
        }
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 애플리케이션 초기화
if __name__ == '__main__':
    # PIL에서 ImageStat 임포트
    from PIL import ImageStat
    
    # 모델 미리 로드
    app.model, app.ensemble_model = load_model()

    # 서버 실행
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)