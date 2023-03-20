<template>
  <div>
    <el-row style="padding: 20px">
      <el-descriptions title="个人信息">
        <el-descriptions-item label="用户名">{{
          state.formInline.nickname
        }}</el-descriptions-item>
        <el-descriptions-item label="唯一身份识别">{{
          state.formInline.userId
        }}</el-descriptions-item>
        <el-descriptions-item label="房间号">{{
          state.formInline.roomId
        }}</el-descriptions-item>
      </el-descriptions>
      <div
        id="controlPanl"
        style="
          position: fixed;
          left: 10px;
          bottom: 20px;
          width: 150px;
          height: 150px;
          background-color: aliceblue;
          color: red;
          display: block;
        "
      ></div>
    </el-row>
    <el-row>
      <el-col :span="6">
        <el-table :data="state.roomUserList" border style="width: 100%">
          <el-table-column prop="userId" label="ID"> </el-table-column>
          <el-table-column prop="nickname" label="账号"> </el-table-column>
          <el-table-column prop="roomId" label="房间"> </el-table-column>
          <el-table-column prop="pub" label="publisher"> </el-table-column>
        </el-table>
      </el-col>
      <el-col :span="10">
        <el-row>
          <div id="allVideo">
            <div
              v-if="state.formInline.pub !== 'pub'"
              id="publisherVideoParent"
              style="position: relative; width: 300px; height: 250px"
            >
              <video
                width="300px"
                height="250px"
                id="publisherVideo"
                style="position: absolute; left: 0; height: auto"
                autoplay
                muted
              ></video>
            </div>
            <div v-if="state.formInline.pub === 'pub'" id="localDomId">
              <div
                id="localdemo01Parent"
                style="
                  position: relative;
                  width: 400px;
                  height: 250px;
                  display: flex;
                  flex-direction: row;
                "
              >
                <video
                  id="localdemo01"
                  controls
                  width="300px"
                  height="250px"
                  style="position: absolute; left: 0; height: auto"
                  autoplay
                  muted
                ></video>
              </div>
              <canvas
                id="output_canvas"
                class="output_canvas"
                style="width: 400px; height: 225px"
              ></canvas>
            </div>
          </div>
        </el-row>
        <el-row>
          <div style="width: 50%; display: flex; flex-direction: row; height: auto">
            <el-input v-model="state.message"></el-input>
            <el-button @click="sendMsgToPub()">发送弹幕</el-button>
          </div>
        </el-row>
        <el-row>
          <img :src="logo" class="pre" />
          <el-button @click="onSelectImage({ src: logo })">改变背景</el-button>
        </el-row>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import logo from "@/assets/1.jpg";
import { reactive } from "vue";
import { useDeviceStore } from "../../store/useDeviceStore";
import { getParams, handleError } from "../demo2/shareMedia";
import { io } from "socket.io-client";
import { ElMessage } from "element-plus";
import { getLocalUserMedia } from "../demo1/getMedia";
// 虚拟背景
import * as SFS from "@mediapipe/selfie_segmentation";
//FPS计算工具
import FPSC from "@mediapipe/control_utils";
//弹幕组件
import Danmaku from "danmaku";
const PeerConnection =
  window.RTCPeerConnection ||
  window.mozRTCPeerConnection ||
  window.webkitRTCPeerConnection;
const useDevice = useDeviceStore();
const state: any = reactive({
  canvasElement: null,
  canvasCtx: null,
  image: null,
  //   selfieSegmentation: null,
  formInline: {
    rtcmessage: undefined,
    rtcmessageRes: undefined, //响应
    videoId: undefined,
    audioInId: undefined,
    nickname: undefined, //展示昵称
    roomId: undefined, //房间号
    pub: undefined, //'pub'
  },
  roomUserList: [],
  message: "",
  linkSocket: undefined,
  centerDialogVisible: false,
  rtcPcParams: {
    // iceTransportPolicy: 'relay', //强制走中继
    // iceServers: [
    //   {urls: 'turn:x.x.x.x:3478', username:'suc', credential:'suc001'}
    // ],
    iceServers: [
      { url: "stun:stun.l.google.com:19302" }, // 谷歌的公共服务
    ],
  },
  localDevice: {
    audioIn: [],
    videoIn: [],
    audioOut: [],
  },
  mediaStatus: {
    audio: false,
    video: false,
  },
  RtcPcMaps: new Map(),
  dataChannelMap: new Map(),
  fpsControl: null,
  virtualMediaStream: null,
  rfId: null,
  danmaku: undefined, //弹幕组件
});

state.formInline.nickname = getParams("nickname");
state.formInline.roomId = getParams("roomId");
state.formInline.userId = getParams("userId");
state.formInline.pub = getParams("pub") ? getParams("pub") : "no";

const init = () => {
  state.linkSocket = io("http://localhost:18080", {
    reconnectionDelayMax: 10000,
    transports: ["websocket"],
    // path:'/mediaServerWsUrl',//和服务端保持一致 namespace
    query: state.formInline,
  });
  state.linkSocket.on("connect", async (e: any) => {
    console.log("server init connect success", state.linkSocket);
    //视频会议初始化
    setTimeout(async () => {
      if (state.roomUserList.length) {
        await initMeetingRoomPc();
        initDanmuContainer();
      }
    }, 2000);
  });
  state.linkSocket.on("roomUserList", (e: any) => {
    console.log("roomUserList", e);
    state.roomUserList = e;
  });
  state.linkSocket.on("msg", async (e: any) => {
    console.log("msg", e);
    if (e["type"] === "join" || e["type"] === "leave") {
      const userId = e["data"]["userId"];
      const nickname = e["data"]["nickname"];
      if (e["type"] === "join") {
        ElMessage({
          message: nickname + " 加入房间",
          type: "success",
        });
      } else {
        ElMessage({
          message: nickname + " 离开房间",
          type: "success",
        });
      }
      setTimeout(() => {
        state.linkSocket.emit("roomUserList", { roomId: state.formInline.roomId });
      }, 1000);
    }
    if (e["type"] === "call") {
      await onCall(e);
    }
    if (e["type"] === "offer") {
      await onRemoteOffer(e["data"]["userId"], e["data"]["offer"]);
    }
    if (e["type"] === "answer") {
      await onRemoteAnswer(e["data"]["userId"], e["data"]["answer"]);
    }
    if (e["type"] === "candidate") {
      onCandiDate(e["data"]["userId"], e["data"]["candidate"]);
    }
  });

  state.linkSocket.on("error", (e: any) => {
    console.log("error", e);
  });
};
const onRemoteOffer = async (fromUid: any, offer: any) => {
  const localUid = state.formInline.userId;
  let pcKey = localUid + "-" + fromUid;
  let pc = new PeerConnection(state.rtcPcParams);
  state.RtcPcMaps.set(pcKey, pc);
  console.log("主播监听到远端offer");
  onPcEvent(pc, localUid, fromUid);
  //NOTE: 主播端创建数据通道
  await createDataChannel(pc, localUid, fromUid);
  //正常背景时
  if (!state.virtualMediaStream) {
    for (const track of state.localStream.getTracks()) {
      pc.addTrack(track);
    }
  } else {
    //设置虚拟背景时
    //注意这里我们直接用的是虚拟背景流 virtualMediaStream 替换原先的 localstream
    for (const track of state.virtualMediaStream.getTracks()) {
      pc.addTrack(track);
    }
  }
  pc.setRemoteDescription(offer);
  let answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  let params = { targetUid: fromUid, userId: localUid, answer: answer };
  state.linkSocket.emit("answer", params);
};
const onRemoteAnswer = async (fromUid: any, answer: any) => {
  const localUid = state.formInline.userId;
  let pcKey = localUid + "-" + fromUid;
  let pc = state.RtcPcMaps.get(pcKey);
  await pc.setRemoteDescription(answer);
};
const onCall = (e: any) => {
  console.log(e);
};
const onCandiDate = (fromUid: any, candidate: any) => {
  const localUid = state.formInline.userId;
  let pcKey = localUid + "-" + fromUid;
  let pc = state.RtcPcMaps.get(pcKey);
  pc.addIceCandidate(candidate);
};
const initMeetingRoomPc = async () => {
  //是否是主播
  if (state.formInline.pub === "pub") {
    state.localStream = await getLocalUserMedia({ audio: false, video: true });
    await setDomVideoStream("localdemo01", state.localStream);
  }
  const localUid = state.formInline.userId;
  //找到当前房间的视频流发布者 即主播
  let publisher = state.roomUserList
    .filter((e: any) => e.userId !== localUid && e.pub === "pub")
    .map((e: any, index: any) => {
      return e.userId;
    });
  if (publisher.length > 0) {
    console.log("找到当前房间的视频流发布者:", publisher);
    publisher = publisher[0];
    state.publisher = publisher;
  } else {
    console.log("无视频发布者");
    return;
  }
  console.log("观众维护与主播的pc");
  //和发布者建立RTC连接 不发送自己视频流
  //学生维护与老师的pc
  let pcKey = localUid + "-" + publisher;
  console.log("pcKey", pcKey);
  let pc = state.RtcPcMaps.get(pcKey);
  if (!pc) {
    pc = new PeerConnection(state.rtcPcParams);
    state.RtcPcMaps.set(pcKey, pc);
  }
  // sendrecv 既发送也接受对方媒体 sendonly 仅发送不接受 recvonly 仅接受 不发送 如何不设置 则不发送也不接受
  pc.addTransceiver("audio", { direction: "recvonly" });
  pc.addTransceiver("video", { direction: "recvonly" });
  onPcEvent(pc, localUid, publisher);
  //1.初始化 RTCPeerConnection => initPc
  //2.初始化基础监听 initPc.ontrack() initPc.ondatachannel() initPc.onicecandidate()
  //3.执行创建数据通道
  await createDataChannel(pc, localUid, publisher);
  //创建offer
  let offer = await pc.createOffer();
  //设置offer未本地描述
  await pc.setLocalDescription(offer);
  //发送offer给被呼叫端
  let params = { targetUid: publisher, userId: localUid, offer: offer };
  state.linkSocket.emit("offer", params);
};
/**
 * 初始化弹幕容器
 */
const initDanmuContainer = () => {
  if (state.formInline.pub === "pub") {
    //主播
    //增加弹幕组件
    state.danmaku = new Danmaku({
      container: document.getElementById("localdemo01Parent"),
      speed: 30,
    });
  } else {
    //客户端
    state.danmaku = new Danmaku({
      container: document.getElementById("publisherVideoParent"),
      speed: 30,
    });
  }
  //首条弹幕
  state.danmaku.emit({
    text: "直播间已开启，请踊跃发言",
    style: { fontSize: "20px", color: "#ff5500" },
  });
};
/**
 * 指定数据通道发送数据
 * @param {Object} uid
 * @param {Object} remoteId
 * @param {Object} msg
 */
const clientDataChannelMsg = (uid: any, remoteId: any, msg: any) => {
  let c = state.dataChannelMap.get(uid + "-" + remoteId);
  if (c) {
    c.send(msg);
  }
};
/**
 * 发布弹幕
 */
const sendMsgToPub = (msg = undefined) => {
  if (!msg) {
    msg = state.message;
  }
  //如果是主播 则遍历所有数据通道给每个客户端发送消息
  if (state.formInline.pub === "pub") {
    state.dataChannelMap.forEach((index: any, k: any) => {
      state.dataChannelMap.get(k).send(msg);
    });
    danmuForRoller(msg); //上屏幕
  } else {
    //私信给主播 主播收到再广播（所以无需自己上屏幕）
    clientDataChannelMsg(state.formInline.userId, state.publisher, msg);
  }
  state.message = undefined;
};
const onAllMessage = (msg: any) => {
  danmuForRoller(msg); //收到消息上屏幕
  //主播收到客户端的消息 广播
  if (state.formInline.pub === "pub") {
    state.dataChannelMap.forEach((index: any, k: any) => {
      state.dataChannelMap.get(k).send(msg);
    });
  }
};
/**
 * 直播留言弹幕
 * @param {Object} msg
 */
const danmuForRoller = (msg: any) => {
  if (state.danmaku) {
    state.danmaku.emit({ text: msg, style: { fontSize: "20px", color: "#ff5500" } });
  }
};
const onPcEvent = (pc: any, localUid: any, remoteUid: any) => {
  pc.ontrack = function (event: any) {
    console.log("监听到主播视频流", event);
    setDomVideoTrick("publisherVideo", event.track);
  };

  pc.ondatachannel = function (ev: any) {
    console.log("用户：" + remoteUid + " 数据通道创建成功");
    ev.channel.onopen = function () {
      console.log("用户：" + remoteUid + " 数据通道打开");
    };
    ev.channel.onmessage = function (data: any) {
      console.log("用户：" + remoteUid + " 数据通道消息", data.data);
      // 弹幕上屏幕
        onAllMessage(data.data)
    };
    ev.channel.onclose = function () {
      console.log("用户：" + remoteUid + " 数据通道关闭");
    };
  };
  pc.onicecandidate = (event: any) => {
    if (event.candidate) {
      state.linkSocket.emit("candidate", {
        targetUid: remoteUid,
        userId: localUid,
        candidate: event.candidate,
      });
    } else {
      /* 在此次协商中，没有更多的候选了 */
      console.log("在此次协商中，没有更多的候选了");
    }
  };
};
/**
 * 创建数据通道
 * @param {Object} pc
 * @param {Object} localUid
 * @param {Object} remoteUid
 */
const createDataChannel = async (pc: any, localUid: any, remoteUid: any) => {
  let datachannel = await pc.createDataChannel(localUid + "-" + remoteUid);
  console.log("datachannel " + localUid + "-" + remoteUid, datachannel);
  state.dataChannelMap.delete(localUid + "-" + remoteUid);
  state.dataChannelMap.set(localUid + "-" + remoteUid, datachannel);
};

/**
 * 指定video dom 设置媒体轨道
 * @param {Object} domId
 * @param {Object} trick
 */
const setDomVideoTrick = (domId: any, trick: any) => {
  let video: any = document.getElementById(domId);
  let stream = video.srcObject;
  if (stream) {
    stream.addTrack(trick);
  } else {
    stream = new MediaStream();
    stream.addTrack(trick);
    video.srcObject = stream;
    video.controls = true;
    video.autoplay = true;
    video.muted = true;
  }
};
let selfieSegmentation: any;
const setDomVideoStream = async (domId: any, newStream: any) => {
  let video: any = document.getElementById(domId);
  console.log("渲染本地视频", video, newStream);
  let stream = video.srcObject;
  if (stream) {
    stream.getAudioTracks().forEach((e: any) => {
      stream.removeTrack(e);
    });
    stream.getVideoTracks().forEach((e: any) => {
      stream.removeTrack(e);
    });
  }
  video.srcObject = newStream;
  video.muted = true;
};
//选择背景
const onSelectImage = async (e: any) => {
  await changeBg(e.src);
};
//重新初始化分割模型并获取新的流
const changeBg = async (src: any) => {
  console.log("改变虚拟背景");
  await initVb(src);
  //虚拟背景流
  //虚拟背景流暂存变量
  state.virtualMediaStream = await virtualBg();
  // this.setDomVideoStream("virtualBgVideoDom",this.virtualMediaStream);
  //切换流
  await changeRemoteStream(state.virtualMediaStream);
};
/**
 * 初始化虚拟背景
 */
const initVb = async (src: any) => {
  console.log("初始化虚拟背景");
  state.canvasElement = document.getElementById("output_canvas");
  state.canvasCtx = state.canvasElement.getContext("2d");
  state.image = new Image();
  state.image.src = src;
  console.log("下载模型");
  selfieSegmentation = await new SFS.SelfieSegmentation({
    locateFile: (file) => {
      console.log(file);
      //   return `http://127.0.0.1:8081/${file}`; //ng  代理模型文件夹
      return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1632777926/${file}`;
    },
  });
  console.log("训练模型");
  await selfieSegmentation.setOptions({
    staticImageModel: false,
    maxNumHands: 2,
    modelSelection: 1, //0 通用模型 1 景观模型
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  await selfieSegmentation.onResults(handleResults);
  //FPS计算
  if (!state.fpsControl) {
    state.fpsControl = new FPSC.FPS();
    //effect  mask or both
    let pal = new FPSC.ControlPanel(document.getElementById("controlPanl"), {
      selfieMode: true,
      modelSelection: 1,
      effect: "both",
    }).add([state.fpsControl]);
  }
};
//切换发送的远程流
const changeRemoteStream = async (stream: any) => {
  //先获取要替换的流 过滤音频 仅仅保留视频
  const [videoTrack] = stream.getVideoTracks();
  //主播端所有关联关系遍历并替换新的流
  state.RtcPcMaps.forEach((e: any) => {
    const senders = e.getSenders();
    const send = senders.find((s: any) => s.track.kind === "video");
    send.replaceTrack(videoTrack);
  });
};
/**
 * 图像分割后处理背景和人像
 *
 **/
const handleResults = (results: any) => {
  //统计FPS
  state.fpsControl.tick();
  // Prepare the nthis.fpsControl ew frame
  state.canvasCtx.save();
  state.canvasCtx.clearRect(0, 0, state.canvasElement.width, state.canvasElement.height);
  state.canvasCtx.drawImage(
    results.segmentationMask,
    0,
    0,
    state.canvasElement.width,
    state.canvasElement.height
  );
  // Draw the image as the new background, and the segmented video on top of that
  //利用canvas绘制新背景
  console.log("利用canvas绘制新背景");
  //canvasCtx.globalCompositeOperation = 'source-in';则意味着处理分割后图像中的人体。
  state.canvasCtx.globalCompositeOperation = "source-out";
  state.canvasCtx.drawImage(
    state.image,
    0,
    0,
    state.image.width,
    state.image.height,
    0,
    0,
    state.canvasElement.width,
    state.canvasElement.height
  );
  state.canvasCtx.globalCompositeOperation = "destination-atop";
  state.canvasCtx.drawImage(
    results.image,
    0,
    0,
    state.canvasElement.width,
    state.canvasElement.height
  );
  // Done
  state.canvasCtx.restore();
};
/**
 * 监听触发模型处理
 * Canvas 本身只是一个画布，但是有对应的 API，可以将画布上的每一帧捕捉并形成媒体流.
 * canvasElement.captureStream方法，通过此方法即可捕捉画布并转换成流。内部唯一的参数就是帧速率FPS，一般设置为 20 到 25 这个区间即可满足正常视觉上的视频流畅度
 */
const virtualBg = async () => {
  let video: any = document.getElementById("localdemo01");
  if (state.rfId) {
    cancelAnimationFrame(state.rfId);
  }
  let lastTime = performance.now();
  async function getFrames() {
    const now = video.currentTime;
    //高FPS 尝试将下面的判断注释
    if (now > lastTime) {
      await selfieSegmentation.send({ image: video });
    }
    lastTime = now;
    //无限定时循环 退出记得取消 cancelAnimationFrame()
    state.rfId = requestAnimationFrame(getFrames);
  }
  getFrames();
  return state.canvasElement.captureStream(25);
};
if (state.formInline.nickname && state.formInline.roomId && state.formInline.userId) {
  init();
}
</script>

<style scoped>
#localdemo01,
#publisherVideo {
  height: 400px;
  width: 400px;
}
html,
body {
  margin: 0;
  padding: 0;
}

.container {
  margin: 20px 0 20px 0;
  padding: 0;
  width: 98%;
  height: 90vh;
}
/* 所有流 */
#allVideo {
  padding: 5px;
  height: auto;
  /* position: relative;
		display: flex;flex-direction: row;justify-content: flex-start;flex-wrap: wrap; */
}
/* 主播端浮窗 */
#localDomId {
  /* border: 1px red solid; */
  display: flex;
  flex-direction: row;
}

.frame-videos {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  padding: 30px;
}
.frame-videos div {
  border: 1px blueviolet solid;
  width: 23%;
  height: 200px;
  position: relative;
  background-color: black;
}
.frame-videos div label {
  color: white;
  position: absolute;
  bottom: 2px;
  left: 2px;
}
.dialog-inner-container {
  margin-left: 35%;
  margin-top: 5%;
}
.pre {
  width: 250px;
  height: 200px;
}
</style>
