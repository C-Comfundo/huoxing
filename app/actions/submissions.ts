'use server'

import { getEditorialRecipientList, getResendClient, getResendFromEmail } from '@/lib/resend'

const MAX_FILE_SIZE = 4.5 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['doc', 'docx', 'txt'])
const ALLOWED_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
])

interface SubmissionActionResult {
  success: boolean
  message: string
}

interface SubmissionPayload {
  author: string
  category: string
  contactEmail: string
  description: string
  originalFilename: string
  title: string
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function getFileExtension(filename: string) {
  const parts = filename.toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() ?? '' : ''
}

function isAllowedFile(file: File) {
  const extension = getFileExtension(file.name)
  const mimeType = file.type.toLowerCase()

  return (
    ALLOWED_EXTENSIONS.has(extension) &&
    (mimeType === '' || ALLOWED_MIME_TYPES.has(mimeType))
  )
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// Normalize attachment names to reduce mojibake and client-side security heuristics.
function normalizeAttachmentFilename(filename: string) {
  const extension = getFileExtension(filename)
  const baseName = extension
    ? filename.slice(0, -(extension.length + 1))
    : filename

  const normalizedBaseName = baseName
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]+/g, '-')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')

  const safeBaseName = normalizedBaseName || 'manuscript'

  return extension ? `${safeBaseName}.${extension}` : safeBaseName
}

function buildSubmissionHtml(data: SubmissionPayload) {
  const author = escapeHtml(data.author)
  const title = escapeHtml(data.title)
  const category = escapeHtml(data.category)
  const contactEmail = escapeHtml(data.contactEmail)
  const description = escapeHtml(data.description)
  const originalFilename = escapeHtml(data.originalFilename)

  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #2c2c2c; line-height: 1.7;">
      <h1 style="font-size: 24px; margin-bottom: 24px;">收到新的投稿</h1>
      <p><strong>作者：</strong>${author}</p>
      <p><strong>标题：</strong>${title}</p>
      <p><strong>栏目：</strong>${category}</p>
      <p><strong>联系邮箱：</strong>${contactEmail}</p>
      <p><strong>原始文件名：</strong>${originalFilename}</p>
      <div style="margin-top: 24px;">
        <strong>简短描述：</strong>
        <p style="margin-top: 8px; white-space: pre-wrap;">${description}</p>
      </div>
      <p style="margin-top: 24px; color: #7d7d7d;">附件中包含作者上传的稿件文件。</p>
    </div>
  `
}

function buildSubmissionText(data: SubmissionPayload) {
  return [
    '收到新的投稿',
    '',
    `作者：${data.author}`,
    `标题：${data.title}`,
    `栏目：${data.category}`,
    `联系邮箱：${data.contactEmail}`,
    `原始文件名：${data.originalFilename}`,
    '',
    '简短描述：',
    data.description,
  ].join('\n')
}

export async function submitManuscript(
  formData: FormData
): Promise<SubmissionActionResult> {
  try {
    const website = getString(formData, 'website')
    if (website) {
      return {
        success: true,
        message: '投稿已发送。',
      }
    }

    const author = getString(formData, 'author')
    const title = getString(formData, 'title')
    const category = getString(formData, 'category')
    const description = getString(formData, 'description')
    const contactEmail = getString(formData, 'contactEmail')
    const file = formData.get('manuscript')

    if (!author || !title || !category || !description || !contactEmail) {
      return {
        success: false,
        message: '请填写所有必填字段。',
      }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      return {
        success: false,
        message: '请填写有效的联系邮箱。',
      }
    }

    if (!(file instanceof File) || file.size === 0) {
      return {
        success: false,
        message: '请上传稿件文件。',
      }
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        message: '文件大小不能超过 4.5MB。',
      }
    }

    if (!isAllowedFile(file)) {
      return {
        success: false,
        message: '仅支持 DOC、DOCX、TXT 文件。',
      }
    }

    const resend = getResendClient()
    const editorialRecipients = getEditorialRecipientList()
    const attachment = Buffer.from(await file.arrayBuffer()).toString('base64')
    const payload: SubmissionPayload = {
      author,
      title,
      category,
      description,
      contactEmail,
      originalFilename: file.name,
    }

    const { data, error } = await resend.emails.send({
      from: getResendFromEmail(),
      to: editorialRecipients,
      replyTo: contactEmail,
      subject: `新投稿｜${category}｜${title}`,
      text: buildSubmissionText(payload),
      html: buildSubmissionHtml(payload),
      attachments: [
        {
          filename: normalizeAttachmentFilename(file.name),
          content: attachment,
        },
      ],
    })

    if (error) {
      console.error('[submitManuscript] Failed to send email:', error)
      return {
        success: false,
        message: '投稿发送失败，请稍后重试。',
      }
    }

    console.info('[submitManuscript] Email accepted by Resend:', {
      emailId: data?.id ?? null,
      recipientCount: editorialRecipients.length,
    })

    return {
      success: true,
      message: '投稿已发送到编辑部邮箱。',
    }
  } catch (error) {
    console.error('[submitManuscript] Unexpected error:', error)
    return {
      success: false,
      message: '投稿发送失败，请检查邮件格式。',
    }
  }
}
