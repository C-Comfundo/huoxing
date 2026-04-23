"use client";

import { useRef, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { submitManuscript } from "@/app/actions/submissions";
import { ARTICLE_CATEGORY_OPTIONS } from "@/lib/article-categories";
import SuccessLetterModal from "./success-letter-modal";

const MAX_FILE_SIZE_BYTES = 4.5 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = "4.5MB";
const ACCEPTED_FILE_TYPES = ".doc,.docx,.txt";
const SUCCESS_MODAL_CONTENT = {
  greeting: "您好！",
  paragraphs: [
    "感谢您将文字托付给《星火好看》编辑部。稿件已进入初评队列，由于全员均为志愿者，请知悉以下默契：",
    "契合本期主题的稿件，14 个自然日内会收到是否收录通知。投稿的稿件默认编辑部可简单修改，并有可能在公众号、小红书、抖音等平台发布。",
    "逾期未回复 ≠ 拒稿，稿件已存入火种库，后续有合适主题会主动联系。期待与您的再次会面。",
    "志愿者团队人力有限，无法为每一份稿件提供一对一回复，还望见谅。但请相信，我们认真读过您写下的每一个字。",
  ],
  exploreTitle: "探索《星火》的更多角落：",
  wechatTitle: "公众号：星火-好看",
  wechatHint: "关注并回复“加入”，进入我们的深度交流群，与更多同类一起点亮微光。",
  signature: "《星火好看》编辑部 敬上",
};

type SubmissionFormProps = {
  submissionEmailHref: string;
  submissionEmailLabel: string;
};

export default function SubmissionForm({
  submissionEmailHref,
  submissionEmailLabel,
}: SubmissionFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [showFileRemoveButton, setShowFileRemoveButton] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const clearFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setSelectedFileName("");
    setShowFileRemoveButton(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFileName(file?.name ?? "");
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleCloseModal = () => {
    setShowSuccessModal(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setIsError(false);
    setShowSuccessModal(false);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setMessage("请先选择稿件文件。");
      setIsError(true);
      setLoading(false);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setMessage(`稿件文件不能超过 ${MAX_FILE_SIZE_LABEL}。`);
      setIsError(true);
      setLoading(false);
      return;
    }

    const result = await submitManuscript(formData);
    setMessage(result.message);
    setIsError(!result.success);

    if (result.success) {
      form.reset();
      clearFile();
      setShowSuccessModal(true);
    }

    setLoading(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-youyou text-[#5D5D5D]">作者</label>
            <input
              type="text"
              name="author"
              required
              className="w-full rounded-xl border border-[#E8E4DF] bg-[#F7F5F0] px-4 py-3 text-[#3A3A3A] outline-none transition-colors focus:border-[#A1887F]"
              placeholder="笔名或署名"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-youyou text-[#5D5D5D]">联系邮箱</label>
            <input
              type="email"
              name="contactEmail"
              required
              className="w-full rounded-xl border border-[#E8E4DF] bg-[#F7F5F0] px-4 py-3 text-[#3A3A3A] outline-none transition-colors focus:border-[#A1887F]"
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.3fr_0.7fr]">
          <div>
            <label className="mb-2 block text-sm font-youyou text-[#5D5D5D]">标题</label>
            <input
              type="text"
              name="title"
              required
              className="w-full rounded-xl border border-[#E8E4DF] bg-[#F7F5F0] px-4 py-3 text-[#3A3A3A] outline-none transition-colors focus:border-[#A1887F]"
              placeholder="稿件标题"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-youyou text-[#5D5D5D]">栏目</label>
            <select
              name="category"
              required
              className="w-full rounded-xl border border-[#E8E4DF] bg-[#F7F5F0] px-4 py-3 text-[#3A3A3A] outline-none transition-colors focus:border-[#A1887F]"
              defaultValue=""
            >
              <option value="" disabled>
                请选择栏目
              </option>
              {ARTICLE_CATEGORY_OPTIONS.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-youyou text-[#5D5D5D]">简短描述</label>
          <textarea
            name="description"
            required
            rows={5}
            className="w-full rounded-2xl border border-[#E8E4DF] bg-[#F7F5F0] px-4 py-3 text-[#3A3A3A] outline-none transition-colors focus:border-[#A1887F]"
            placeholder="简单介绍这篇稿件的主题、背景或你想表达的内容。"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-youyou text-[#5D5D5D]">上传稿件</label>
          <input
            ref={fileInputRef}
            type="file"
            name="manuscript"
            accept={ACCEPTED_FILE_TYPES}
            onChange={handleFileChange}
            className="sr-only"
          />

          <div className="rounded-xl border border-dashed border-[#D7CCC8] bg-white px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openFilePicker}
                className="inline-flex items-center rounded-full bg-[#3A3A3A] px-4 py-2 text-sm text-white transition-colors hover:bg-[#2A2A2A]"
              >
                选择文件
              </button>

              {selectedFileName ? (
                <div
                  className="inline-flex max-w-full items-center rounded-full border border-[#D8D1CB] bg-[#F7F5F0] px-4 py-2 text-sm text-[#5D5D5D] transition-colors hover:border-[#BCAEA4]"
                  onMouseEnter={() => setShowFileRemoveButton(true)}
                  onMouseLeave={() => setShowFileRemoveButton(false)}
                >
                  <span className="max-w-[220px] truncate sm:max-w-[280px]">{selectedFileName}</span>
                  <button
                    type="button"
                    onClick={clearFile}
                    className={`ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full text-[#8D8178] transition-opacity duration-150 hover:text-[#3A3A3A] focus:outline-none ${
                      showFileRemoveButton
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                    }`}
                    aria-label="删除已选择文件"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-sm text-[#9A8F87]">未选择任何文件</span>
              )}
            </div>
          </div>

          <p className="mt-2 text-sm text-[#8D8D8D]">
            最大 {MAX_FILE_SIZE_LABEL}。如果超过 {MAX_FILE_SIZE_LABEL}，请发送到我们的邮箱：
            <a
              href={`mailto:${submissionEmailHref}`}
              className="ml-1 text-[#A1887F] transition-colors hover:text-[#8D6E63]"
            >
              {submissionEmailLabel}
            </a>
          </p>
        </div>

        {message && !showSuccessModal ? (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-youyou ${
              isError
                ? "border-red-100 bg-red-50 text-red-600"
                : "border-green-100 bg-green-50 text-green-600"
            }`}
          >
            {message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full bg-[#3A3A3A] px-6 py-3 text-sm text-white transition-colors hover:bg-[#2A2A2A] disabled:bg-[#8D8D8D]"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="font-youyou">{loading ? "提交中..." : "提交稿件"}</span>
        </button>
      </form>

      <SuccessLetterModal 
        isOpen={showSuccessModal} 
        onClose={handleCloseModal} 
        content={SUCCESS_MODAL_CONTENT} 
      />
    </>
  );
}
