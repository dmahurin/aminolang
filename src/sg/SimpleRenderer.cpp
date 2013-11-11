#include "SimpleRenderer.h"


SimpleRenderer::SimpleRenderer() {
    modelViewChanged = false;
}
void SimpleRenderer::startRender(AminoNode* root) {
    GLContext* c = new GLContext();
    this->render(c,root);
//    printf("shader count = %d\n",c->shadercount);
//    printf("shader dupe count = %d\n",c->shaderDupCount);
//    printf("texture dupe count = %d\n",c->texDupCount);
    
}
void SimpleRenderer::render(GLContext* c, AminoNode* root) {
    if(root == NULL) {
        printf("WARNING. NULL NODE!\n");
        return;
    }
    
    //skip non-visible nodes
    if(root->visible != 1) return;
    
    c->save();
    c->translate(root->tx,root->ty);
    c->scale(root->scalex,root->scaley);
    c->rotate(root->rotatex,root->rotatey,root->rotatez);
    
    switch(root->type) {
    case GROUP:
        this->drawGroup(c,(Group*)root);
        break;
    case RECT:
        this->drawRect(c,(Rect*)root);
        break;
    case POLY:
        this->drawPoly(c,(PolyNode*)root);
        break;
    case TEXT:
        this->drawText(c,(TextNode*)root);
        break;
    }
    
    c->restore();
}        

void colorShaderApply(GLContext *ctx, ColorShader* shader, GLfloat modelView[16], GLfloat verts[][2], GLfloat colors[][3], GLfloat opacity) {
    ctx->useProgram(shader->prog);
    glUniformMatrix4fv(shader->u_matrix, 1, GL_FALSE, modelView);
    glUniformMatrix4fv(shader->u_trans,  1, GL_FALSE, ctx->globaltx);
    glUniform1f(shader->u_opacity, opacity);
    
    if(opacity != 1.0) {
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    }

    glVertexAttribPointer(shader->attr_pos,   2, GL_FLOAT, GL_FALSE, 0, verts);
    glVertexAttribPointer(shader->attr_color, 3, GL_FLOAT, GL_FALSE, 0, colors);
    glEnableVertexAttribArray(shader->attr_pos);
    glEnableVertexAttribArray(shader->attr_color);
    
    glDrawArrays(GL_TRIANGLES, 0, 6);
    
    glDisableVertexAttribArray(shader->attr_pos);
    glDisableVertexAttribArray(shader->attr_color);
}

void textureShaderApply(GLContext *ctx, TextureShader* shader, GLfloat modelView[16], GLfloat verts[][2], GLfloat texcoords[][2], int texid) {
//void TextureShader::apply(GLfloat modelView[16], GLfloat trans[16], GLfloat verts[][2], GLfloat texcoords[][2], int texid) {
//        textureShaderApply(c,textureShader, modelView, verts, texcoords, rect->texid);

    //printf("doing texture shader apply %d\n",texid);
    ctx->useProgram(shader->prog);
    glEnable(GL_BLEND);
    glBlendFunc(GL_ONE, GL_ONE_MINUS_SRC_ALPHA);
    
    glUniformMatrix4fv(shader->u_matrix, 1, GL_FALSE, modelView);
    glUniformMatrix4fv(shader->u_trans,  1, GL_FALSE, ctx->globaltx);
    glUniform1i(shader->attr_tex, 0);
    

    glVertexAttribPointer(shader->attr_texcoords, 2, GL_FLOAT, GL_FALSE, 0, texcoords);
    glEnableVertexAttribArray(shader->attr_texcoords);

    glVertexAttribPointer(shader->attr_pos,   2, GL_FLOAT, GL_FALSE, 0, verts);
    glEnableVertexAttribArray(shader->attr_pos);
    glActiveTexture(GL_TEXTURE0);
    
    ctx->bindTexture(texid );
    //glBindTexture(GL_TEXTURE_2D, texid);
    glDrawArrays(GL_TRIANGLES, 0, 6);
    
    glDisableVertexAttribArray(shader->attr_pos);
    glDisableVertexAttribArray(shader->attr_texcoords);
    glDisable(GL_BLEND);
}

void SimpleRenderer::drawGroup(GLContext* c, Group* group) {
    if(group->cliprect == 1) {
        //turn on stenciling
        glDepthMask(GL_FALSE);
        glEnable(GL_STENCIL_TEST);
        //clear the buffers
        
        //setup the stencil
        glStencilFunc(GL_ALWAYS, 0x1, 0xFF);
        glStencilOp(GL_KEEP, GL_KEEP, GL_REPLACE);
        glStencilMask(0xFF);
        glColorMask( GL_FALSE, GL_FALSE, GL_FALSE, GL_FALSE );
        glDepthMask( GL_FALSE );
        //glClear(GL_STENCIL_BUFFER_BIT | GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
        
        //draw the stencil
        float x = 0;
        float y = 0;
        float x2 = group->w;
        float y2 = group->h;
        GLfloat verts[6][2];
        verts[0][0] = x;
        verts[0][1] = y;
        verts[1][0] = x2;
        verts[1][1] = y;
        verts[2][0] = x2;
        verts[2][1] = y2;
        
        verts[3][0] = x2;
        verts[3][1] = y2;
        verts[4][0] = x;
        verts[4][1] = y2;
        verts[5][0] = x;
        verts[5][1] = y;
        GLfloat colors[6][3];
        for(int i=0; i<6; i++) {
            for(int j=0; j<3; j++) {
                colors[i][j] = 1.0;
            }
        }
        colorShaderApply(c,colorShader, modelView, verts, colors, 1.0);
    
        //set function to draw pixels where the buffer is equal to 1
        glStencilFunc(GL_EQUAL, 0x1, 0xFF);
        glStencilMask(0x00);
        //turn color buffer drawing back on
        glColorMask(GL_TRUE,GL_TRUE,GL_TRUE,GL_TRUE);
        
    }
    for(int i=0; i<group->children.size(); i++) {
        this->render(c,group->children[i]);
    }
    if(group->cliprect == 1) {
        glDisable(GL_STENCIL_TEST);
    }
}

void SimpleRenderer::drawPoly(GLContext* ctx, PolyNode* poly) {
    int len = poly->geometry->size();
    int dim = poly->dimension;
    GLfloat verts[len][dim];// = malloc(sizeof(GLfloat[2])*len);
    for(int i=0; i<len/dim; i++) {
        verts[i][0] = poly->geometry->at(i*dim);
        if(dim >=2) {
            verts[i][1] = poly->geometry->at(i*dim+1);
        }
        if(dim >=3) {
            verts[i][2] = poly->geometry->at(i*dim+2);
        }
    }
    GLfloat colors[len][3];
    for(int i=0; i<len/dim; i++) {
        colors[i][0] = 0.0;
        colors[i][1] = 1.0;
        colors[i][2] = 1.0;
    }
    
    ctx->useProgram(colorShader->prog);
    glUniformMatrix4fv(colorShader->u_matrix, 1, GL_FALSE, modelView);
    glUniformMatrix4fv(colorShader->u_trans,  1, GL_FALSE, ctx->globaltx);
    glUniform1f(colorShader->u_opacity, poly->opacity);
    
    if(poly->opacity != 1.0) {
        glEnable(GL_BLEND);
        glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
    }

    if(dim == 2) {
        glVertexAttribPointer(colorShader->attr_pos,   2, GL_FLOAT, GL_FALSE, 0, verts);
    }
    if(dim == 3) {
        glVertexAttribPointer(colorShader->attr_pos,   3, GL_FLOAT, GL_FALSE, 0, verts);
    }
    glVertexAttribPointer(colorShader->attr_color, 3, GL_FLOAT, GL_FALSE, 0, colors);
    glEnableVertexAttribArray(colorShader->attr_pos);
    glEnableVertexAttribArray(colorShader->attr_color);
    
    glDrawArrays(GL_LINE_LOOP, 0, len/dim);
    
    glDisableVertexAttribArray(colorShader->attr_pos);
    glDisableVertexAttribArray(colorShader->attr_color);
}
void SimpleRenderer::drawRect(GLContext* c, Rect* rect) {
    c->save();
    float x =  rect->x;
    float y =  rect->y;
    float x2 = rect->x+rect->w;
    float y2 = rect->y+rect->h;
        
    GLfloat verts[6][2];
    verts[0][0] = x;
    verts[0][1] = y;
    verts[1][0] = x2;
    verts[1][1] = y;
    verts[2][0] = x2;
    verts[2][1] = y2;
    
    verts[3][0] = x2;
    verts[3][1] = y2;
    verts[4][0] = x;
    verts[4][1] = y2;
    verts[5][0] = x;
    verts[5][1] = y;
        
    GLfloat colors[6][3];
    
    for(int i=0; i<6; i++) {
        for(int j=0; j<3; j++) {
            colors[i][j] = 0.5;
            if(j==0) colors[i][j] = rect->r;
            if(j==1) colors[i][j] = rect->g;
            if(j==2) colors[i][j] = rect->b;
        }
    }
        
    if(rect->texid != INVALID) {
        GLfloat texcoords[6][2];
        float tx  = rect->left;
        float ty2 = rect->bottom;//1;
        float tx2 = rect->right;//1;
        float ty  = rect->top;//0;
        texcoords[0][0] = tx;    texcoords[0][1] = ty;
        texcoords[1][0] = tx2;   texcoords[1][1] = ty;
        texcoords[2][0] = tx2;   texcoords[2][1] = ty2;
        
        texcoords[3][0] = tx2;   texcoords[3][1] = ty2;
        texcoords[4][0] = tx;    texcoords[4][1] = ty2;
        texcoords[5][0] = tx;    texcoords[5][1] = ty;
        textureShaderApply(c,textureShader, modelView, verts, texcoords, rect->texid);
    } else {
        colorShaderApply(c,colorShader, modelView, verts, colors, rect->opacity);
    }
    c->restore();
}

int te = 0;

void SimpleRenderer::drawText(GLContext* c, TextNode* text) {
    if(fontmap.size() < 1) return;
    if(text->fontid == INVALID) return;
    AminoFont* font = fontmap[text->fontid];
    
    
    c->save();
    //flip the y axis
    c->scale(1,-1);
    glActiveTexture(GL_TEXTURE0);
    c->bindTexture(font->atlas->id );
    glEnable( GL_BLEND );
    glBlendFunc( GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA );
    c->useProgram(font->shader);
    {
        //by only doing this init work once we save almost 80% of the time for drawing text
        if(font->texuni == -1) {
            font->texuni   = glGetUniformLocation( font->shader, "texture" );
            font->mvpuni   = glGetUniformLocation( font->shader, "mvp" );
            font->transuni = glGetUniformLocation( font->shader, "trans" );
        }
        glUniform1i(font->texuni,0 );
        if(modelViewChanged) {
//            glUniformMatrix4fv(font->mvpuni,         1, 0,  modelView  );
        }
        glUniformMatrix4fv(font->mvpuni,         1, 0,  modelView  );
        //only the global transform will change each time
        glUniformMatrix4fv(font->transuni,        1, 0,  c->globaltx );
        vertex_buffer_render(text->buffer, GL_TRIANGLES );
    }
    c->restore();
}
