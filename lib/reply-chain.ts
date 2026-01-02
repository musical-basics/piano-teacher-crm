import type { Message } from "./types"

interface ReplyChainOptions {
    studentName: string
    studentEmail: string
    instructorName?: string
    instructorEmail?: string
    maxMessages?: number
}

/**
 * Formats a date in Gmail style: "On Wed, Dec 17, 2025 at 5:43 AM"
 */
function formatGmailDate(date: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    const dayName = days[date.getDay()]
    const monthName = months[date.getMonth()]
    const dayNum = date.getDate()
    const year = date.getFullYear()

    let hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12

    return `On ${dayName}, ${monthName} ${dayNum}, ${year} at ${hours}:${minutes} ${ampm}`
}

/**
 * Strips HTML tags and returns plain text for quoting
 */
function stripHtml(html: string): string {
    // Replace <br>, <br/>, </p>, </div> with newlines
    let text = html.replace(/<br\s*\/?>/gi, '\n')
    text = text.replace(/<\/p>/gi, '\n')
    text = text.replace(/<\/div>/gi, '\n')
    // Remove all other HTML tags
    text = text.replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    text = text.replace(/&nbsp;/g, ' ')
    text = text.replace(/&amp;/g, '&')
    text = text.replace(/&lt;/g, '<')
    text = text.replace(/&gt;/g, '>')
    text = text.replace(/&quot;/g, '"')
    // Trim extra whitespace
    text = text.replace(/\n{3,}/g, '\n\n')
    return text.trim()
}

/**
 * Generates Gmail-style quoted reply chain HTML
 * 
 * Example output:
 * ```
 * <div class="gmail_quote" style="...">
 *   <div>On Wed, Dec 17, 2025 at 5:43 AM Mimi Rodnay &lt;mimi@gmail.com&gt; wrote:</div>
 *   <blockquote style="...">
 *     Dear Lionel
 *     Every day is good...
 *   </blockquote>
 * </div>
 * ```
 */
export function generateReplyChainHtml(
    messages: Message[],
    options: ReplyChainOptions
): string {
    const {
        studentName,
        studentEmail,
        instructorName = "Lionel Yu From MusicalBasics",
        instructorEmail = "support@musicalbasics.com",
        maxMessages = 10
    } = options

    // Take up to maxMessages, most recent first for reply chain
    const recentMessages = [...messages]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxMessages)

    if (recentMessages.length === 0) {
        return ""
    }

    // Build the quoted HTML
    let chainHtml = ""

    for (const msg of recentMessages) {
        const isInstructor = msg.sender === "instructor"
        const senderName = isInstructor ? instructorName : studentName
        const senderEmail = isInstructor ? instructorEmail : studentEmail
        const dateStr = formatGmailDate(new Date(msg.timestamp))
        const plainContent = stripHtml(msg.content)

        chainHtml += `
<div class="gmail_quote" style="margin: 0 0 0 0.8em; border-left: 1px solid #ccc; padding-left: 1em; color: #500050;">
  <div style="margin: 1em 0 0.5em 0; color: #777;">
    ${dateStr} ${senderName} &lt;${senderEmail}&gt; wrote:
  </div>
  <blockquote style="margin: 0; padding: 0; color: #222;">
    ${plainContent.split('\n').map(line => `<p style="margin: 0 0 0.5em 0;">${line || '&nbsp;'}</p>`).join('')}
  </blockquote>
</div>`
    }

    return `
<div style="margin-top: 2em; padding-top: 1em; border-top: 1px solid #eee;">
  ${chainHtml}
</div>`
}

/**
 * Generates a plain-text version of the reply chain for accessibility
 */
export function generateReplyChainText(
    messages: Message[],
    options: ReplyChainOptions
): string {
    const {
        studentName,
        studentEmail,
        instructorName = "Lionel Yu From MusicalBasics",
        instructorEmail = "support@musicalbasics.com",
        maxMessages = 10
    } = options

    const recentMessages = [...messages]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, maxMessages)

    if (recentMessages.length === 0) {
        return ""
    }

    let chainText = "\n\n---\n"

    for (const msg of recentMessages) {
        const isInstructor = msg.sender === "instructor"
        const senderName = isInstructor ? instructorName : studentName
        const senderEmail = isInstructor ? instructorEmail : studentEmail
        const dateStr = formatGmailDate(new Date(msg.timestamp))
        const plainContent = stripHtml(msg.content)

        chainText += `\n${dateStr} ${senderName} <${senderEmail}> wrote:\n`
        chainText += plainContent.split('\n').map(line => `> ${line}`).join('\n')
        chainText += '\n'
    }

    return chainText
}
