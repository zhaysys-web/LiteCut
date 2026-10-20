import React from 'react';
import { Modal } from '../ui/Modal';
import { ShieldCheck, Lock, EyeOff, ServerOff } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🛡️ 隐私政策与安全服务条款" maxWidth="md">
      <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-800">
          <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="font-bold block text-sm">我们的绝对安全承诺：</span>
            您的视频数据 100% 在您的本地设备中处理，绝无上传行为。
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2.5">
            <ServerOff className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">1. 无服务器上传存储</strong>
              <p className="mt-0.5 text-slate-500">
                除“视频去水印”需提交短视频分享链接进行元数据解析外，所有视频裁剪、压缩、比例转换、提取音频等功能均通过浏览器本地的 WebAssembly 引擎在离线内存中完成，我们没有、也无法获取您的视频文件。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">2. 不收集个人身份信息</strong>
              <p className="mt-0.5 text-slate-500">
                LiteCut 永久免费使用，不强制要求注册账号、登录或绑定手机号，绝不会追踪用户的个人敏感隐私。
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <EyeOff className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-800">3. 免责声明与版权规范</strong>
              <p className="mt-0.5 text-slate-500">
                本工具箱仅作为个人短视频创作与音视频格式转换的技术辅助工具。用户使用去水印功能下载素材时，请务必尊重原作者版权，仅用于学习交流，切勿用于任何商业侵权行为。
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
