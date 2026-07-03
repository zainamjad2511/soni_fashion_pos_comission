import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './icons/TechnicalIcons.jsx'

const MAX_WIDTH = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
}

export function useDismissOnEscape(isOpen, onClose, disabled = false) {
  useEffect(() => {
    if (!isOpen || !onClose || disabled) return undefined
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, disabled])
}

export function getOverlayDismissProps(onClose, disabled = false) {
  return {
    onClick: (event) => {
      if (disabled || !onClose || event.target !== event.currentTarget) return
      onClose()
    },
  }
}

export function getOverlayPanelProps() {
  return {
    onClick: (event) => event.stopPropagation(),
  }
}

export function StandardModalLabel({ children, htmlFor, className = '' }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-[11px] font-bold uppercase tracking-[0.14em] text-[#7A6F69] block mb-2 ${className}`}
    >
      {children}
    </label>
  )
}

export function StandardModalInput({ className = '', ...props }) {
  return (
    <input
      className={`w-full py-2.5 bg-transparent border-b border-[#C9C0B5] text-[#2E2822] font-mono focus:outline-none focus:border-[#2E2822] placeholder-[#7A6F69] transition-colors ${className}`}
      {...props}
    />
  )
}

export function StandardModalAction({ children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`w-full py-3.5 bg-[#2E2822] hover:bg-[#3D3530] text-[#F7F5F0] font-sans font-bold text-[11px] uppercase tracking-[0.2em] transition-colors rounded-none ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

function ModalHeader({ title, titleId, subtitle, eyebrow, showCloseButton, onClose, headerVariant = 'default' }) {
  if (!title && !showCloseButton && !eyebrow) return null

  const titleClasses = headerVariant === 'editorial'
    ? 'font-display font-bold text-2xl text-[#2E2822]'
    : 'font-display font-bold text-sm uppercase tracking-[0.18em] text-[#2E2822]'

  return (
    <div className={`${headerVariant === 'editorial' ? 'p-8' : 'px-6 pt-6 pb-4'} border-b border-[#C9C0B5]/50 flex items-start justify-between gap-4 shrink-0`}>
      <div className="min-w-0">
        {eyebrow && (
          <span className="font-sans text-[10px] tracking-[0.18em] uppercase text-[#7A6F69] font-bold block mb-1">
            {eyebrow}
          </span>
        )}
        {title && (
          <h3 id={titleId} className={titleClasses}>
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-xs font-sans text-[#7A6F69] mt-1">{subtitle}</p>
        )}
      </div>
      {showCloseButton && (
        <button
          type="button"
          onClick={onClose}
          className="text-[#7A6F69] hover:text-[#2E2822] transition-colors shrink-0 p-1"
          aria-label="Close dialog"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

function ModalFooter({ footer }) {
  if (!footer) return null

  return (
    <div className="px-6 py-5 border-t border-[#C9C0B5]/50 mt-auto shrink-0">
      {footer}
    </div>
  )
}

export function StandardModal({
  isOpen,
  onClose,
  title,
  titleId,
  subtitle,
  eyebrow,
  headerVariant = 'default',
  children,
  footer,
  maxWidth = 'md',
  variant = 'center',
  zIndex = 200,
  closeOnBackdrop = true,
  showCloseButton = false,
  className = '',
  bodyClassName = '',
  maxHeight = '85vh',
}) {
  useEffect(() => {
    if (!isOpen) return undefined
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const modalTitleId = titleId || (title ? 'standard-modal-title' : undefined)
  const widthClass = MAX_WIDTH[maxWidth] || MAX_WIDTH.md

  const handleBackdropClick = (event) => {
    if (!closeOnBackdrop || !onClose) return
    if (event.target !== event.currentTarget) return
    onClose()
  }

  const sharedPanelClasses = `bg-[#F7F5F0] flex flex-col rounded-none text-[#2E2822] ${className}`
  const bodyClasses = `px-6 py-5 flex-1 overflow-y-auto ${bodyClassName}`

  if (variant === 'drawer') {
    return createPortal(
      <div
        className="fixed inset-0 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end"
        style={{ zIndex }}
        onClick={handleBackdropClick}
      >
        <div
          className={`w-full ${widthClass} h-full border-l border-[#C9C0B5] shadow-none ${sharedPanelClasses}`}
          style={{ maxHeight: '100vh' }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
        >
          <ModalHeader
            title={title}
            titleId={modalTitleId}
            subtitle={subtitle}
            eyebrow={eyebrow}
            headerVariant={headerVariant}
            showCloseButton={showCloseButton ?? true}
            onClose={onClose}
          />
          <div className={bodyClasses}>{children}</div>
          <ModalFooter footer={footer} />
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
      style={{ zIndex }}
      onClick={handleBackdropClick}
    >
      <div
        className={`w-full ${widthClass} ${sharedPanelClasses}`}
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
      >
        <ModalHeader
          title={title}
          titleId={modalTitleId}
          subtitle={subtitle}
          eyebrow={eyebrow}
          headerVariant={headerVariant}
          showCloseButton={showCloseButton}
          onClose={onClose}
        />
        <div className={bodyClasses}>{children}</div>
        <ModalFooter footer={footer} />
      </div>
    </div>,
    document.body
  )
}
