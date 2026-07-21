import styled from 'styled-components';

export const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  box-sizing: border-box;
  
  @media (min-width: 768px) {
    padding: 0 2rem;
  }
`;

export const Grid = styled.div<{ $columns?: number; $gap?: string; $tabletColumns?: number; $desktopColumns?: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.$columns || 1}, 1fr);
  gap: ${props => props.$gap || '1rem'};
  width: 100%;

  @media (min-width: 768px) {
    grid-template-columns: repeat(${props => props.$tabletColumns || props.$columns || 2}, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(${props => props.$desktopColumns || props.$tabletColumns || props.$columns || 3}, 1fr);
  }
`;

export const Flex = styled.div<{ $direction?: 'row' | 'column'; $align?: string; $justify?: string; $gap?: string; $wrap?: string }>`
  display: flex;
  flex-direction: ${props => props.$direction || 'row'};
  align-items: ${props => props.$align || 'stretch'};
  justify-content: ${props => props.$justify || 'flex-start'};
  gap: ${props => props.$gap || '0'};
  flex-wrap: ${props => props.$wrap || 'nowrap'};
  width: 100%;
`;

export const ResponsiveFlex = styled(Flex)`
  flex-direction: column;
  
  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

export const Card = styled.div`
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  box-shadow: var(--shadow);
  transition: var(--transition);
  width: 100%;
  box-sizing: border-box;

  &:hover {
    box-shadow: var(--shadow-hover);
  }
`;

export const BottomSheetModal = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  z-index: 1000;
  padding: 0;
  animation: fadeIn 0.2s ease-out;

  @media (min-width: 768px) {
    align-items: center;
    padding: 2rem;
  }
`;

export const BottomSheetContent = styled.div`
  background-color: var(--surface-color);
  width: 100%;
  max-width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 24px 24px 0 0;
  padding: 1.5rem;
  box-sizing: border-box;
  animation: slideUp 0.3s ease-out;

  @media (min-width: 768px) {
    max-width: 500px;
    border-radius: 24px;
    animation: fadeIn 0.3s ease-out;
  }
`;

export const ScrollablePills = styled.div`
  display: flex;
  overflow-x: auto;
  max-width: 100%;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
  -webkit-overflow-scrolling: touch;
  
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
`;

export const Pill = styled.button<{ $active?: boolean }>`
  background-color: ${props => props.$active ? 'var(--primary-color)' : 'var(--surface-color)'};
  color: ${props => props.$active ? 'var(--white)' : 'var(--text-color)'};
  border: 1px solid ${props => props.$active ? 'var(--primary-color)' : 'var(--border-color)'};
  border-radius: 999px;
  padding: 0.5rem 1rem;
  white-space: nowrap;
  font-size: var(--font-sm);
  font-weight: 500;
  min-height: 44px; /* Touch target size */
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background-color: ${props => props.$active ? 'var(--primary-dark)' : 'var(--surface-hover-color)'};
    color: ${props => props.$active ? 'var(--white)' : 'var(--text-color)'};
  }
`;
