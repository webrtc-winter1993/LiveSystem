<template>
  <div style="width: 98%; height: 98%; margin-top: 20px">
    <el-row :gutter="20">
      <el-col :span="24">
        <el-form :inline="true" :model="state.formInline" class="demo-form-inline">
          <el-form-item label="选择摄像头">
            <el-select v-model="state.formInline.videoId" placeholder="摄像头">
              <el-option
                v-for="(item, index) in useDevice.localDevice.videoIn"
                :key="index"
                :label="item.label"
                :value="item.id"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="选择麦克风">
            <el-select v-model="state.formInline.audioInId" placeholder="麦克风">
              <el-option
                v-for="(item, index) in useDevice.localDevice.audioIn"
                :key="index"
                :label="item.label"
                :value="item.id"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="选择听筒">
            <el-select v-model="state.formInline.audioOutId" placeholder="听筒">
              <el-option
                v-for="(item, index) in useDevice.localDevice.audioOut"
                :key="index"
                :label="item.label"
                :value="item.id"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="分辨率:Width">
            <el-input v-model="state.formInline.width"></el-input>
          </el-form-item>
          <el-form-item label="分辨率:Height">
            <el-input v-model="state.formInline.height"></el-input>
          </el-form-item>
          <el-form-item label="FPS">
            <el-input v-model="state.formInline.frameRate"></el-input>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="onSubmit">确定</el-button>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="onOver">结束</el-button>
          </el-form-item>
        </el-form>
      </el-col>
    </el-row>
    <el-row>
      <video id="localdemo01" autoplay controls muted playsinline="Booleanish"></video>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { getLocalDevice, getTargetDeviceMedia } from "./getMedia";
import { useDeviceStore } from "@/store/useDeviceStore";
const useDevice = useDeviceStore();
const state: any = reactive({
  formInline: {
    videoId: undefined,
    audioInId: undefined,
    audioOutId: undefined,
    width: 1080,
    height: 720,
    frameRate: 24,
  },
});

getLocalDevice();
const onSubmit = async () => {
  let domId = "localdemo01";
  let video: any = document.getElementById(domId);
  let stream = video?.srcObject;
  console.log("stream:", stream);
  if (stream) {
    //先清除所有音频流
    stream.getAudioTracks().forEach((e: any) => {
      stream.removeTrack(e);
    });
    //先清除所有视频流
    stream.getVideoTracks().forEach((e: any) => {
      stream.removeTrack(e);
    });
  }
  console.log("formInline:", state.formInline);
  let newStream = await getTargetDeviceMedia(
    state.formInline.videoId,
    state.formInline.audioInId,
    state.formInline
  );
  video.srcObject = newStream;
  video.muted = true;
};
const onOver = () => {
  let domId = "localdemo01";
  let video: any = document.getElementById(domId);
  let stream = video?.srcObject;
  if (stream) {
    stream.getAudioTracks().forEach((e: any) => {
      stream.removeTrack(e);
    });
    stream.getVideoTracks().forEach((e: any) => {
      stream.removeTrack(e);
    });
  }
  video.srcObject = null;
  video.muted = false;
};
</script>

<style lang="less" scoped>
#localdemo01 {
  width: 500px;
  height: 500px;
}
</style>
