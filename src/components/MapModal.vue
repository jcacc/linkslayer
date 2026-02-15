<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="map-container">
        <img
          src="https://linkslayer.mweatherford.rocks/map-nobg.png"
          alt="LINKSLAYER map"
        />

        <div
          v-for="(article, index) in fullChain"
          :key="index"
          class="dot"
          :class="{
            'active-dot': index === currentTargetIndex,
            'current-article': article === currentArticle,
            'completed-article': isCompleted(article),
            'next-target': isNextTarget(article, index),
          }"
          :style="dotStyle(index)"
        >
          {{ index + 1 }}
        </div>
      </div>
      <div class="legend">
        <div class="legend-item"><span class="legend-current"></span> Current Article</div>
        <div class="legend-item"><span class="legend-target"></span> Next Target</div>
        <div class="legend-item"><span class="legend-completed"></span> Completed Article</div>
        <div class="legend-item"><span class="legend-upcoming"></span> Upcoming Article</div>
      </div>
      <button @click="$emit('close')" class="close-button">Close Map</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  fullChain: {
    type: Array,
    default: () => [],
  },
  currentTargetIndex: {
    type: Number,
    default: -1,
  },
  currentArticle: {
    type: String,
    default: "",
  },
  path: {
    type: Array,
    default: () => [],
  },
});

defineEmits(["close"]);

const pathCoordinates = [
  { x: 50, y: 90 },
  { x: 27, y: 80 },
  { x: 36, y: 71 },
  { x: 25, y: 65 },
  { x: 29, y: 54 },
  { x: 46, y: 53 },
  { x: 70, y: 50 },
  { x: 55, y: 40 },
  { x: 50, y: 35 },
  { x: 45, y: 30 },
  { x: 50, y: 25 },
  { x: 60, y: 20 },
];

const dotStyle = (index) => {
  const coords = pathCoordinates[index];
  if (coords) {
    return {
      left: `${coords.x}%`,
      top: `${coords.y}%`,
    };
  }
  return {};
};

const isCompleted = (article) => {
  return props.path.includes(article) && article !== props.currentArticle;
};

const isNextTarget = (article, index) => {
  return index === props.currentTargetIndex;
};

</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #333;
  color: #eee;
  padding: 25px;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.map-container {
  position: relative;
  width: 100%;
  padding-bottom: 75%; /* Aspect ratio for the map image */
  background-color: #222; /* Fallback for map area */
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 20px;
}

.map-container img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.7;
}

.dot {
  position: absolute;
  width: 30px;
  height: 30px;
  background-color: #555;
  color: #fff;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  transform: translate(-50%, -50%);
  border: 2px solid #777;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
  cursor: help;
  transition: all 0.2s ease-in-out;
}

.dot:hover {
  transform: translate(-50%, -50%) scale(1.1);
  background-color: #777;
  border-color: #fff;
}

/* Specific dot states */
.completed-article {
  background-color: #28a745; /* Green */
  border-color: #1e7e34;
  opacity: 0.8;
}

.current-article {
  background-color: #007bff; /* Blue */
  border-color: #0056b3;
  animation: pulse-blue 1.5s infinite;
  z-index: 10;
}

.next-target {
  background-color: #ffc107; /* Yellow */
  border-color: #d39e00;
  animation: pulse-yellow 1.5s infinite;
  z-index: 9;
}

/* Animations for specific states */
@keyframes pulse-blue {
  0% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 10px rgba(0, 123, 255, 0.7); }
  50% { transform: translate(-50%, -50%) scale(1.1); box-shadow: 0 0 20px rgba(0, 123, 255, 1); }
  100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 10px rgba(0, 123, 255, 0.7); }
}

@keyframes pulse-yellow {
  0% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 10px rgba(255, 193, 7, 0.7); }
  50% { transform: translate(-50%, -50%) scale(1.1); box-shadow: 0 0 20px rgba(255, 193, 7, 1); }
  100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 10px rgba(255, 193, 7, 0.7); }
}

.legend {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 10px;
  margin-bottom: 20px;
  font-size: 0.9em;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.legend-item span {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #777;
}

.legend-current { background-color: #007bff; border-color: #0056b3;}
.legend-target { background-color: #ffc107; border-color: #d39e00;}
.legend-completed { background-color: #28a745; border-color: #1e7e34;}
.legend-upcoming { background-color: #555; border-color: #777;}

.close-button {
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s ease;
}

.close-button:hover {
  background-color: #0056b3;
}
</style>
