<template>
  <div class="container">
    <el-row style="padding: 20px">
      <el-descriptions title="会议信息">
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
    </el-row>
    <el-row>
      <el-col :span="24">
        <el-row>
          <div
            id="allVideo"
            style="
              display: flex;
              flex-direction: row;
              justify-content: flex-start;
              flex-wrap: wrap;
            "
          >
            <video
              id="localdemo01"
              @click="getLocalStreamSettings()"
              autoplay
              muted
            ></video>
            <label style="z-index: 999; position: fixed; right: 25px; bottom: 30px">
              <el-button type="warning" size="" @click="getLocalStreamSettings"
                >本地媒体流最新参数</el-button
              >
            </label>
          </div>
        </el-row>
        <el-row>
          <div class="frame-videos" id="frame-videos">
            <div
              :id="item.userId"
              v-for="(item, index) in state.roomUserList"
              v-if="state.formInline.userId !== item?.userId"
              :ref="item.userId"
              :key="item.userId"
            >
              <label>
                {{ item.nickname }}
                <span style="color: bisque">
                  {{ item.bitrate }}
                </span>
                <el-button type="info" size="" @click="getRtcPeerInfo(item.userId)"
                  >变更画面参数</el-button
                >
                <el-button type="warning" size="" @click="setBiterate(item.userId)"
                  >变更Bitrate</el-button
                >
              </label>
            </div>
          </div>
        </el-row>
      </el-col>
    </el-row>

    <el-row style="position: fixed; bottom: 20px; width: 100%">
      <div>
        <el-button v-if="!state.mediaStatus.video" @click="videoControl(true)"
          >打开视频</el-button
        >
        <el-button v-if="state.mediaStatus.video" @click="videoControl(false)"
          >关闭视频</el-button
        >
        <el-button v-if="!state.mediaStatus.audio" @click="audioControl(true)"
          >打开麦克风</el-button
        >
        <el-button v-if="state.mediaStatus.audio" @click="audioControl(false)"
          >关闭麦克风</el-button
        >
        <el-button @click="showDetails()">stats</el-button>
      </div>
    </el-row>

    <el-dialog
        v-model="state.centerDialogVisible"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      fullscreen
      center
    >
      <div class="dialog-inner-container">
        <el-form
          :model="state.formInline"
          :rules="state.rules"
          ref="ruleFormRef"
          label-width="80px"
          style="width: 300px"
        >
          <el-form-item label="身份ID" prop="userId">
            <el-input
              style="width: 220px"
              v-model="state.formInline.userId"
              placeholder="不填默认为浏览器ID"
            ></el-input>
          </el-form-item>
          <el-form-item label="房间号" prop="roomId">
            <el-input
              style="width: 220px"
              v-model="state.formInline.roomId"
              placeholder="房间号"
            ></el-input>
          </el-form-item>
          <el-form-item label="用户名" prop="nickname">
            <el-input
              style="width: 220px"
              v-model="state.formInline.nickname"
              placeholder="展示昵称"
            ></el-input>
          </el-form-item>
          <el-form-item label="摄像头" prop="videoId">
            <el-select v-model="state.formInline.videoId" placeholder="摄像头">
              <el-option
                v-for="(item, index) in useDevice.localDevice.videoIn"
                :key="index"
                :label="item.label"
                :value="item.id"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="麦克风" prop="audioInId">
            <el-select v-model="state.formInline.audioInId" placeholder="麦克风">
              <el-option
                v-for="(item, index) in useDevice.localDevice.audioIn"
                :key="index"
                :label="item.label"
                :value="item.id"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item label="分辨率" prop="rao">
            <el-select v-model="state.formInline.rao" placeholder="分辨率">
              <el-option
                v-for="(item, index) in state.raoList"
                :key="index"
                :label="item"
                :value="item"
              ></el-option>
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button
              style="margin-left: 70px"
              type="warning"
              @click="joinRoom(ruleFormRef)"
              >进入</el-button
            >
          </el-form-item>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { io } from "socket.io-client";
import { reactive, ref } from "vue";
import { useDeviceStore } from "../../store/useDeviceStore";
import { handleError, getParams } from "../demo2/shareMedia";
import {getLocalDevice} from '../demo1/getMedia'
import { getLocalUserMedia } from "../demo1/getMedia";
import { ElMessage, ElNotification, FormInstance, FormRules } from "element-plus";
const ruleFormRef = ref<FormInstance>();
getLocalDevice()
const useDevice = useDeviceStore();
console.log(useDevice.localDevice)
var PeerConnection =
  window.RTCPeerConnection ||
  window.mozRTCPeerConnection ||
  window.webkitRTCPeerConnection;
const state = reactive<any>({
  RtcPcMaps: new Map(),
  linkSocket: undefined,
  centerDialogVisible: true,
  rtcPcParams: {
    // iceTransportPolicy: 'relay', //强制走中继
    iceServers: [
      // {urls: 'turn:124.70.x.x:3478', username:'suc', credential:'suc001'},
    ],
  },
  roomUserList: [],
  mediaStatus: {
    audio: false,
    video: false,
  },
  rules: {
    roomId: [{ required: true, message: "请填写房间号", trigger: "change" }],
    nickname: [{ required: true, message: "请填写展示昵称", trigger: "change" }],
    videoId: [{ required: true, message: "请选择摄像头", trigger: "change" }],
    // audioInId: [{ required: true, message: "请选择麦克风", trigger: "change" }],
    rao: [{ required: true, message: "请选择分辨率", trigger: "change" }],
  },
  formInline: {
    rtcmessage: undefined,
    rtcmessageRes: undefined, //响应
    videoId: undefined,
    audioInId: undefined,
    nickname: undefined, //展示昵称
    roomId: undefined, //房间号
    rao: "640X480",
  },
  raoList: ["1920X1080", "1080X720", "720X640", "640X480", "480X320"],
  localStream: undefined,
  rtcmessage: undefined,
  constraintOpt: {
    audio: false,
    video: {
      width: 720,
      height: 480,
    },
  },
  statsTimerMap: new Map(),
  lastPeerStatsMap: new Map(),
});
const getLocalStreamSettings = async () => {
  let videoTrack = state.localStream.getVideoTracks()[0];
  console.log("本地媒体流最新参数", videoTrack.getSettings());
};
const init = () => {
    //初始化服务器连接
    console.log("1.初始化服务器连接");
  console.log("server：http://localhost:18080");
  state.linkSocket = io("http://localhost:18080", {
    reconnectionDelayMax: 10000,
    transports: ["websocket"],
    query: state.formInline,
  });
  state.linkSocket.on("connect", async (e: any) => {
    console.log("2.连接成功进入房间");
    console.log("server init connect success", state.linkSocket);
    state.centerDialogVisible = false; //加入后
    //获取房间用户列表（新用户进房间后需要和房间内每个用户进行RTC连接 后进入着主动push offer）
    console.log("3.通知服务端roomUserList 的 roomId");
    state.linkSocket.emit("roomUserList", { roomId: state.formInline.roomId });
  });
  state.linkSocket.on("roomUserList", (e: any) => {
    console.log("4.监听服务端roomUserList 返回的 room信息");
    console.log("roomUserList", e);
    state.roomUserList = e;
    //拿到房间用户列表之后开始建立RTC连接
    console.log("5.拿到房间用户列表之后开始建立RTC连接");
    initMeetingRoomPc();
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
        state.roomUserList.push({
          userId: userId,
          nickname: nickname,
          roomId: state.formInline.roomId,
        });
      } else {
        ElMessage({
          message: nickname + " 离开房间",
          type: "success",
        });
        state.RtcPcMaps.delete(state.formInline.userId + "-" + userId);
        removeChildVideoDom(userId);
      }
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
   
  if (!state.localStream) {
    state.localStream = await getLocalUserMedia(state.constraintOpt);
    //开始静音和关闭摄像头
    // initMediaStatus(state.localStream);
  }
  console.log('6.显示视频流画面')
  setDomVideoStream("localdemo01", state.localStream);
  const localUid = state.formInline.userId;
  console.log('7.获取全部用户后，剔出自己。')
  let others = state.roomUserList
    .filter((e: any) => e.userId !== localUid)
    .map((e: any, index: any) => {
      return e.userId;
    });
console.log('8.新进来的用户都会去和房间内的其他人进行 RTC 关联')
  others.forEach(async (uid: any) => {
    let pcKey = localUid + "-" + uid;
    let pc = state.RtcPcMaps.get(pcKey);
    if (!pc) {
      pc = new PeerConnection(state.rtcPcParams);
      state.RtcPcMaps.set(pcKey, pc);
    }
    for (const track of state.localStream.getTracks()) {
      pc.addTrack(track);
    }
    //创建offer
    let offer = await pc.createOffer({ iceRestart: true });
    //设置offer未本地描述
    await pc.setLocalDescription(offer);
    //发送offer给被呼叫端
    let params = { targetUid: uid, userId: localUid, offer: offer };
    state.linkSocket.emit("offer", params);
    onPcEvent(pc, localUid, uid);
  });
};
const onPcEvent = (pc: any, localUid: any, remoteUid: any) => {
  pc.ontrack = function (event: any) {
    console.log(event);
    createRemoteDomVideoStream(remoteUid, event.track);
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
const onRemoteOffer = async (fromUid: any, offer: any) => {
  const localUid = state.formInline.userId;
  let pcKey = localUid + "-" + fromUid;
  let pc = state.RtcPcMaps.get(pcKey);
  if (!pc) {
    pc = new PeerConnection(state.rtcPcParams);
    state.RtcPcMaps.set(pcKey, pc);
  }
  onPcEvent(pc, localUid, fromUid);
  for (const track of state.localStream.getTracks()) {
    pc.addTrack(track);
  }
  state.localStream.getAudioTracks[0];
  await pc.setRemoteDescription(offer);
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
const audioControl = (b: any) => {
  state.RtcPcMaps.forEach((v: any, k: any) => {
    const senders = v.getSenders();
    const send = senders.find((s: any) => s.track.kind === "audio");
    send.track.enabled = b;
    state.mediaStatus.audio = send.track.enabled;
  });
  state.localStream.getAudioTracks()[0].enabled = b;
  state.mediaStatus.audio = b;
};
const videoControl = (b: any) => {
  state.RtcPcMaps.forEach((v: any, k: any) => {
    const senders = v.getSenders();
    const send = senders.find((s: any) => s.track.kind === "video");
    send.track.enabled = b;
    state.mediaStatus.video = send.track.enabled;
  });
  state.localStream.getVideoTracks()[0].enabled = b;
  state.mediaStatus.video = b;
};
const initMediaStatus = (stream:any) => {
    stream.getVideoTracks()[0].enabled = false;
    stream.getAudioTracks()[0].enabled = false;
  ElNotification({
    title: "温馨提示",
    message: "进入房间默认已关闭你的麦克风和摄像头，请手动打开",
    type: "warning",
  });
};

const setDomVideoStream = async (domId: any, newStream: any) => {
  let video: any = document.getElementById(domId);
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
const removeChildVideoDom = (domId: any) => {
  let video: any = document.getElementById(domId);
  if (video) {
    video.parentNode.removeChild(video);
  }
};
const setBiterate = async (uid: any) => {
  let pcKey = state.formInline.userId + "-" + uid;
  let pc = state.RtcPcMaps.get(pcKey);
  if (pc) {
    let senders = pc.getSenders();
    let sender = senders.find((s: any) => s.track.kind === "video");
    const params = sender.getParameters();
    //比特率设置
    let bitrate = 100 * 1000;
    params.encodings[0].maxBitrate = bitrate;
    //同步参数
    await sender.setParameters(params);
  }
};
const getRtcPeerInfo = async (uid: any) => {
  let pcKey = state.formInline.userId + "-" + uid;
  let p = state.RtcPcMaps.get(pcKey);
  if (p) {
    const senders = p.getSenders();
    const sender = senders.find((s: any) => s.track.kind === "video");
    console.log("设置前参数", sender.track.getSettings());
    let height = 200;
    let frameRate = 30;
    let aspectRatio = 2.777777778;
    await sender.track.applyConstraints({ height, frameRate, aspectRatio });
    const receivers = p.getReceivers();
    const receive = receivers.find((s: any) => s.track.kind === "video");
    console.log("远程流画面设置", receive.track.getSettings());
  }
};
const joinRoom = async (formEl: any) => {
  if (!formEl) return;
  await formEl.validate((valid: any, fields: any) => {
    if (valid) {
      init();
      window.sessionStorage.setItem("userInfo", JSON.stringify(state.formInline));
    } else {
      console.log("error submit!!");
      return false;
    }
  });
};

const createRemoteDomVideoStream = (domId: any, trick: any) => {
    console.log('9.创建远程视频流')
  let parentDom: any = document.getElementById(domId);
  let id = domId + "-media";
  let video: any = document.getElementById(id);
  if (!video) {
    video = document.createElement("video");
    video.id = id;
    video.controls = false;
    video.autoplay = true;
    video.muted = false;
    video.style.width = "100%";
    video.style.height = "100%";
  }
  let stream = video.srcObject;
  console.log("stream==>trick", stream, trick);
  if (stream) {
    stream.addTrack(trick);
  } else {
    let newStream = new MediaStream();
    newStream.addTrack(trick);
    video.srcObject = newStream;
    video.muted = false;
    parentDom.appendChild(video);
  }
};
const showDetails = () => {
  console.log(state.localStream);
  let userClients = state.roomUserList.filter(
    (e: any) => e.userId != state.formInline.userId
  );
  userClients.forEach((e: any) => {
    let peer = state.RtcPcMaps.get(state.formInline.userId + "-" + e.userId);
    if (peer) {
      getNetStats(e.userId, peer);
    }
  });
};
const getNetStats = (userId: any, pc: any) => {
  let timer = state.statsTimerMap.get(userId);
  if (timer) {
    clearInterval(timer);
  } else {
    timer = setInterval(() => {
      calculateReceiverBitrate(userId, pc);
    }, 2000);
    state.statsTimerMap.set(userId, timer);
  }
};
const calculateSendBitrate = (userId: any, pc: any) => {
  let lastResultForStats = state.lastPeerStatsMap.get(userId);
  pc.getStats().then((res: any) => {
    res.forEach((report: any) => {
      let bytes;
      let headerBytes;
      let packets;
      //出口宽带 outbound-rtp  入口宽带 inbound-rtp
      if (report.type === "outbound-rtp" && report.kind === "video") {
        const now = report.timestamp;
        bytes = report.bytesSent;
        headerBytes = report.headerBytesSent;
        packets = report.packetsSent;

        if (lastResultForStats && lastResultForStats.has(report.id)) {
          let bf = bytes - lastResultForStats.get(report.id).bytesSent;
          let hbf = headerBytes - lastResultForStats.get(report.id).headerBytesSent;
          let pacf = packets - lastResultForStats.get(report.id).packetsSent;
          let t = now - lastResultForStats.get(report.id).timestamp;
          // calculate bitrate
          const bitrate = ((8 * bf) / t).toFixed(2);
          const headerrate = ((8 * hbf) / t).toFixed(2);
          const packetrate = Math.floor((1000 * pacf) / t);
          console.log(
            `${userId} ==> Bitrate ${bitrate} kbps, overhead ${headerrate} kbps, ${packetrate} packets/second`
          );
        }
      }
    });
    state.lastPeerStatsMap.set(userId, res);
  });
};
const calculateReceiverBitrate = (userId: any, pc: any) => {
  let lastResultForStats = state.lastPeerStatsMap.get(userId);
  pc.getStats().then((res: any) => {
    res.forEach((report: any) => {
      let bytes;
      let headerBytes;
      let packets;
      //出口宽带 outbound-rtp  入口宽带 inbound-rtp
      if (report.type === "inbound-rtp" && report.kind === "video") {
        const now = report.timestamp;
        bytes = report.bytesReceived;
        headerBytes = report.headerBytesReceived;
        packets = report.packetsReceived;

        if (lastResultForStats && lastResultForStats.has(report.id)) {
          let bf = bytes - lastResultForStats.get(report.id).bytesReceived;
          let hbf = headerBytes - lastResultForStats.get(report.id).headerBytesReceived;
          let pacf = packets - lastResultForStats.get(report.id).packetsReceived;
          let t = now - lastResultForStats.get(report.id).timestamp;
          // calculate bitrate
          const bitrate = ((8 * bf) / t).toFixed(2);
          const headerrate = ((8 * hbf) / t).toFixed(2);
          const packetrate = Math.floor((1000 * pacf) / t);
          let obj = state.roomUserList.filter((e: any) => e.userId === userId)[0];
          console.log(obj);
          console.log(
            `${userId} ==> Bitrate ${bitrate} kbps, overhead ${headerrate} kbps, ${packetrate} packets/second`
          );
        }
      }
    });
    state.lastPeerStatsMap.set(userId, res);
  });
};
</script>

<style lang="less" scoped>
html,
body {
  margin: 0;
  padding: 0;
}

.container {
  margin: 20px 0 20px 0;
  padding: 0;
}
#localdemo01 {
  width: 300px;
  height: 200px;
  position: fixed;
  bottom: 24px;
  right: 4px;
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
  z-index: 9999;
}
.dialog-inner-container {
  margin-left: 35%;
  margin-top: 5%;
}
</style>
