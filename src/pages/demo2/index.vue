<template>
    <div style="width: 95%;height: 80vh;margin-top: 30px;">
		<el-row :gutter="20">
			<el-col :span="20">
				<el-form :inline="true" :model="state.formInline" class="demo-form-inline">
				  <el-form-item>
				    <el-button type="primary" @click="onSubmit">点击获取当前屏幕分享</el-button>
				  </el-form-item>
				</el-form>
			</el-col>
		</el-row>
		<el-row>
			<video id="localdemo01" autoplay controls muted></video>
		</el-row>
	</div>
</template>

<script lang="ts" setup>
import { reactive } from 'vue';
import { getShareMedia } from './shareMedia'

const state = reactive({
    formInline:{}
})

const onSubmit =async () =>{
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
  let newStream = await getShareMedia()
  video.srcObject = newStream;
  video.muted = true;

}
</script>

<style lang="less" scoped>
#localdemo01{
		width: 500px;
		height: 400px;
		
	}
</style>