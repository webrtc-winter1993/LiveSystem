<template>
  <div style="width: 98%; height: 98vh; margin-top: 30px">
    <el-row :gutter="20">
      <el-col :span="6">
        <div style="width: 100%; height: 800px">
          <ul v-for="(item, index) in state.roomUserList" :key="index">
            <el-tag size="small" @click="getStats" type="success">{{
              "用户" + item.nickname
            }}</el-tag>
            <el-tag
              v-if="state.userInfo.userId === item.userId"
              type="danger"
              size="small"
              @click="changeBitRate()"
              >增加比特率</el-tag
            >
            <el-button
              size="small"
              type="primary"
              v-if="state.userInfo.userId !== item.userId"
              @click="call(item)"
              >通话</el-button
            >
            <el-button
              v-if="state.userInfo.userId === item.userId"
              size="small"
              type="danger"
              @click="openVideoOrNot"
              >切换</el-button
            >
          </ul>
        </div>
      </el-col>
      <el-col :span="18">
        <el-row>
          <div class="box">
            <el-form
              :model="state.formInline"
              label-width="250px"
              class="demo-form-inline"
            >
              <el-form-item label="发送消息">
                <el-input
                  v-model="state.formInline.rtcmessage"
                  placeholder="消息"
                ></el-input>
              </el-form-item>
              <el-form-item label="远端消息">
                <div>{{ state.formInline.rtcmessageRes }}</div>
              </el-form-item>

              <el-form-item>
                <el-button type="primary" @click="sendMessageUserRtcChannel"
                  >点击发送</el-button
                >
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="onSubmit">点击获取当前屏幕分享</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-row>
        <el-row>
          <div style="display: flex; flex-direction: row; justify-content: flex-start">
          <div>
            <div>本地dom渲染</div>
            <video
              @click="streamInfo('localdemo01')"
              id="localdemo01"
              autoplay
              controls
              muted
            ></video>
          </div>
          <div>
            <div>远端dom渲染</div>
            <video
              @click="streamInfo('remoteVideo01')"
              id="remoteVideo01"
              autoplay
              controls
              muted
            ></video>
          </div>
          </div>
        </el-row>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import { io } from "socket.io-client";
import { getLocalUserMedia } from "../demo1/getMedia";
import { ElMessage } from "element-plus";
import { getShareMedia } from '../demo2/shareMedia'
const PeerConnection =
  window.RTCPeerConnection ||
  window.mozRTCPeerConnection ||
  window.webkitRTCPeerConnection;

const state: any = reactive({
  linkSocket: undefined,
  rtcPcParams: {
    iceServers: [
      { url: "stun:stun.l.google.com:19302" }, // 谷歌的公共服务
    ],
  },
  roomUserList: [],
  userInfo: {}, //用户信息
  formInline: {
    rtcmessage: undefined,
    rtcmessageRes: undefined, //响应
  },
  localRtcPc: undefined,
  rtcmessage: undefined,
  mapSender: [], //发送的媒体
  channel: null,
});

function getParams(queryName: any) {
  let url = window.location.href;
  let query = decodeURI(url.split("?")[1]);
  let vars = query.split("&");
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    if (pair[0] === queryName) {
      return pair[1];
    }
  }
  return null;
}



const streamInfo = (domId: any) => {
  let video: any = document.getElementById(domId);
  console.log(video.srcObject);
};

//pc代表PeerConnection, caller为A，callee为B
const initCallerInfo = async (callerId: any, calleeId: any) => {
  state.mapSender = [];
  //初始化pc
  console.log("初始化A的pc");
  state.localRtcPc = new PeerConnection();
  //获取本地媒体并添加到pc中
  console.log("获取本地媒体并添加到pc中");
  let localStream = await getLocalUserMedia({ audio: false, video: true });
  for (const track of localStream.getTracks()) {
    state.mapSender.push(state.localRtcPc.addTrack(track));
  }
  // 本地dom渲染
  await setDomVideoStream("localdemo01", localStream);
  //回调监听
  console.log("回调监听");
  onPcEvent(state.localRtcPc, callerId, calleeId);
  //创建offer
  console.log("创建offer");
  let offer = await state.localRtcPc.createOffer({ iceRestart: true });
  //设置offer未本地描述
  console.log("设置offer未本地描述");
  await state.localRtcPc.setLocalDescription(offer);
  //发送offer给被呼叫端
  console.log("发送offer给被呼叫端");
  let params = { targetUid: calleeId, userId: callerId, offer: offer };
  state.linkSocket.emit("offer", params);
};

const initCalleeInfo = async (localUid: any, fromUid: any) => {
  //初始化pc
  console.log("初始化B的pc");
  state.localRtcPc = new PeerConnection();
  //初始化本地媒体信息
  console.log("获取本地媒体并添加到pc中");
  let localStream = await getLocalUserMedia({ audio: false, video: true });
  for (const track of localStream.getTracks()) {
    state.localRtcPc.addTrack(track);
  }
  //dom渲染
  console.log("本地dom渲染");
  await setDomVideoStream("localdemo01", localStream);
  //监听
  onPcEvent(state.localRtcPc, localUid, fromUid);
};
const init = (userId: any, roomId: any, nickname: any) => {
  const that = this;
  state.userInfo = {
    userId: userId,
    roomId: roomId,
    nickname: nickname,
  };
  state.linkSocket = io("http://localhost:18080", {
    reconnectionDelayMax: 10000,
    transports: ["websocket"],
    query: {
      userId: userId,
      roomId: roomId,
      nickname: nickname,
    },
  });
  state.linkSocket.on("connect", (e: any) => {
    console.log("链接socket");
    console.log("server init connect success", state.linkSocket);
  });
  state.linkSocket.on("roomUserList", (e: any) => {
    console.log("roomUserList", e);
    state.roomUserList = e;
  });
  state.linkSocket.on("msg", async (e: any) => {
    console.log("监听socket msg", e);
    if (e["type"] === "join" || e["type"] === "leave") {
      setTimeout(() => {
        let params = { roomId: getParams("roomId") };
        state.linkSocket.emit("roomUserList", params);
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
      state.localRtcPc.addIceCandidate(e.data.candidate);
    }
  });
  state.linkSocket.on("error", (e: any) => {
    console.log("error", e);
  });
};
//设置显示我的媒体流
const setDomVideoStream = async (domId: any, newStream: any) => {
  let video: any = document.getElementById(domId);
  console.log('渲染本地视频',video,newStream)
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

//设置显示远端媒体流
const setRemoteDomVideoStream = (domId: any, track: any) => {
  console.log("远端dom渲染");
  let video: any = document.getElementById(domId);
  let stream = video.srcObject;
  if (stream) {
    stream.addTrack(track);
  } else {
    let newStream = new MediaStream();
    newStream.addTrack(track);
    video.srcObject = newStream;
    video.muted = true;
  }
};

const onPcEvent = (pc: any, localUid: any, remoteUid: any) => {
  console.log("创建通信通道实例");
  state.channel = pc.createDataChannel("chat");
  pc.ontrack = function (event: any) {
    console.log("媒体流监听:", event);
    setRemoteDomVideoStream("remoteVideo01", event.track);
  };
  pc.onnegotiationneeded = function (e: any) {
    console.log("重新协商", e);
  };
  pc.ondatachannel = function (ev: any) {
    console.log("创建通信通道");
    console.log("Data channel is created!");
    ev.channel.onopen = function () {
      console.log("Data channel ------------open----------------");
    };
    ev.channel.onmessage = function (data: any) {
      console.log("远端消息Data channel ------------msg----------------", data);
      state.formInline.rtcmessageRes = data.data;
    };
    ev.channel.onclose = function () {
      console.log("Data channel ------------close----------------");
    };
  };
  pc.onicecandidate = (event: any) => {
    console.log("监听信令");
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
  console.log("响应A发送的offer");
  console.log("设置远端描述");
  state.localRtcPc.setRemoteDescription(offer);
  console.log("创建应答answer");
  let answer = await state.localRtcPc.createAnswer();
  console.log("设置本地描述");
  await state.localRtcPc.setLocalDescription(answer);
  let params = { targetUid: fromUid, userId: getParams("userId"), answer: answer };
  console.log("并通过信令服务器发送给A");
  state.linkSocket.emit("answer", params);
};
const onRemoteAnswer = async (fromUid: any, answer: any) => {
  console.log("响应B发送的answer");
  console.log("设置远端描述");
  await state.localRtcPc.setRemoteDescription(answer);
};

/**
 * 打开或关闭摄像头
 */
const openVideoOrNot = () => {
  const senders = state.localRtcPc.getSenders();
  const send = senders.find((s: any) => s.track.kind === "video");
  send.track.enabled = !send.track.enabled; //控制视频显示与否
};
function handleError(error: Error) {
  alert("摄像头无法正常使用，请检查是否占用或缺失");
  console.error("navigator.MediaDevices.getUserMedia error: ", error.message, error.name);
}


//分享屏幕
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
  let newStream:any = await getShareMedia()
  video.srcObject = newStream;
  video.muted = true;
  const senders = state.localRtcPc.getSenders();
  const [videoTrack] = newStream.getVideoTracks(); 
  const send = senders.find((s:any) => s.track.kind === 'video')//找到视频类型发送方信息
  send.replaceTrack(videoTrack) //替换视频媒体信息
}

const changeBitRate = () => {
  console.log(state.localRtcPc);
  const senders = state.localRtcPc.getSenders();
  const send = senders.find((s: any) => s.track.kind === "video");
  const parameters = send.getParameters();
  parameters.encodings[0].maxBitrate = 1 * 1000 * 1024;
  send.setParameters(parameters);
};

const sendMessageUserRtcChannel = () => {
  if (!state.channel) {
    ElMessage({
      message: "请先建立webrtc连接",
      type: "warning",
    });
    return;
  }
  state.channel.send(state.formInline.rtcmessage);
  state.formInline.rtcmessage = undefined;
};

const sendMsgToOne = (event: any, params: any) => {};

const call = async (item: any) => {
  console.log("呼叫：", item);
  initCallerInfo(getParams("userId"), item.userId);
  let params = {
    userId: getParams("userId"),
    targetUid: item.userId,
  };
  state.linkSocket.emit("call", params);
};
const onCall = async (e: any) => {
  console.log("响应远程呼叫：", e);
  await initCalleeInfo(e.data["targetUid"], e.data["userId"]);
};
//获取视频相关信息
var time: any;
const getStats = () => {
  const senders = state.localRtcPc.getSenders();
  const send = senders.find((s: any) => s.track.kind === "video");
  console.log(send.getParameters().encodings);
  let lastResultForStats: any; //上次计算结果
  clearInterval(time);
  time = setInterval(() => {
    state.localRtcPc.getStats().then((res: any) => {
      res.forEach((report: any) => {
        let bytes;
        let headerBytes;
        let packets;
        // console.log(report)
        //出口宽带 outbound-rtp  入口宽带 inbound-rtp
        if (report.type === "outbound-rtp" && report.kind === "video") {
          const now = report.timestamp;
          bytes = report.bytesSent;
          headerBytes = report.headerBytesSent;
          packets = report.packetsSent;
          console.log(bytes, headerBytes, packets);
          if (lastResultForStats && lastResultForStats.has(report.id)) {
            let bf = bytes - lastResultForStats.get(report.id).bytesSent;
            let hbf = headerBytes - lastResultForStats.get(report.id).headerBytesSent;
            let pacf = packets - lastResultForStats.get(report.id).packetsSent;
            let t = now - lastResultForStats.get(report.id).timestamp;
            // calculate bitrate
            const bitrate = Math.floor((8 * bf) / t);
            const headerrate = Math.floor((8 * hbf) / t);
            const packetrate = Math.floor((1000 * pacf) / t);
            console.log(
              `Bitrate ${bitrate} kbps, overhead ${headerrate} kbps, ${packetrate} packets/second`
            );
          }
        }
      });
      lastResultForStats = res;
    });
  }, 4000);
};

if (getParams("userId")) {
  init(getParams("userId"), getParams("roomId"), getParams("userId"));
}
</script>

<style lang="less" scoped>
#localdemo01 {
  width: 300px;
  height: 200px;
}
#remoteVideo01 {
  width: 300px;
  height: 200px;
}
.box {
  width: 800px;
  height: 200px;
  display: flex;
  flex-direction: row;
  align-items: center;
}
</style>
